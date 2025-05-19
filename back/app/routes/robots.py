from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from loguru import logger

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate
from app.models.user import User
from app.models.robots import (
    Robot,
    RobotTask,
    RobotLog,
    RobotType,
    RobotStatus,
    RobotCapability,
    TaskStatus,
)
from app.schemas.robots import (
    RobotResponse,
    RobotCreate,
    RobotUpdate,
    TaskResponse,
    TaskCreate,
    TaskUpdate,
    RobotCommandRequest,
    GroupCommandRequest,
    CommandResponse,
    RobotQueryParams,
    TaskQueryParams,
)
from app.schemas.common import PaginatedResponse, StatusMessage, WebSocketMessage
from app.websockets.connection_manager import manager

router = APIRouter()


@router.post(
    "",
    response_model=RobotResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_robot(
    robot_data: RobotCreate, current_user: User = Depends(get_manager_user)
):
    """Создание нового робота/дрона"""
    # Проверяем уникальность идентификатора
    existing_robot = await Robot.get_or_none(robot_id=robot_data.robot_id)
    if existing_robot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Робот с ID {robot_data.robot_id} уже существует",
        )

    # Создаем робота
    robot = await Robot.create(
        robot_id=robot_data.robot_id,
        name=robot_data.name,
        type=robot_data.type,
        capabilities=robot_data.capabilities,
        location=robot_data.location.dict() if robot_data.location else {},
        software_version=robot_data.software_version,
        created_by=current_user,
    )

    # Возвращаем созданного робота в формате API
    return RobotResponse(
        robot_id=robot.robot_id,
        name=robot.name,
        type=robot.type,
        status=robot.status,
        battery_level=robot.battery_level,
        location=robot_data.location,
        capabilities=robot.capabilities,
        active_task=robot.active_task,
        last_maintenance=robot.last_maintenance,
        software_version=robot.software_version,
        created_at=robot.created_at,
        updated_at=robot.updated_at,
    )


@router.get("", response_model=PaginatedResponse[RobotResponse])
async def get_robots(
    query_params: RobotQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """Получение списка роботов с фильтрацией"""
    # Проверяем, есть ли роботы в базе
    robots_count = await Robot.all().count()
    if robots_count == 0:
        # Создаем тестовых роботов
        await create_test_robots(current_user)

    # Строим фильтры для запроса
    filters = {}

    if query_params.type:
        filters["type"] = query_params.type

    if query_params.status:
        filters["status"] = query_params.status

    if query_params.capability:
        # Для фильтрации по возможностям нужно использовать более сложный запрос
        # Здесь упрощенная реализация - получаем всех роботов и фильтруем в Python
        pass

    if query_params.search:
        # Поиск по названию или ID
        # Для SQLite можно использовать фильтр вида name LIKE %search%
        # Для PostgreSQL можно использовать более сложный поиск
        # Здесь используем простой поиск для SQLite
        search = f"%{query_params.search}%"
        # Здесь должен быть OR фильтр, но упрощаем до названия
        filters["name__icontains"] = query_params.search

    # Получаем пагинированный список роботов с примененными фильтрами
    items, total, page, size, pages = await paginate(
        Robot.all().order_by("-updated_at"), pagination, filters
    )

    # Преобразуем модели в схемы для API
    response_items = []
    for robot in items:
        response_items.append(
            RobotResponse(
                robot_id=robot.robot_id,
                name=robot.name,
                type=robot.type,
                status=robot.status,
                battery_level=robot.battery_level,
                location=robot.location if robot.location else None,
                capabilities=robot.capabilities,
                active_task=robot.active_task,
                last_maintenance=robot.last_maintenance,
                software_version=robot.software_version,
                created_at=robot.created_at,
                updated_at=robot.updated_at,
            )
        )

    # Возвращаем пагинированный ответ
    return PaginatedResponse[RobotResponse](
        items=response_items, total=total, page=page, size=size, pages=pages
    )


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(
    robot_id: str = Path(..., description="ID робота"),
    current_user: User = Depends(get_current_user),
):
    """Получение информации о конкретном роботе"""
    robot = await Robot.get_or_none(robot_id=robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Робот с ID {robot_id} не найден",
        )

    return RobotResponse(
        robot_id=robot.robot_id,
        name=robot.name,
        type=robot.type,
        status=robot.status,
        battery_level=robot.battery_level,
        location=robot.location if robot.location else None,
        capabilities=robot.capabilities,
        active_task=robot.active_task,
        last_maintenance=robot.last_maintenance,
        software_version=robot.software_version,
        created_at=robot.created_at,
        updated_at=robot.updated_at,
    )


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(
    update_data: RobotUpdate,
    robot_id: str = Path(..., description="ID робота"),
    current_user: User = Depends(get_manager_user),
):
    """Обновление информации о роботе"""
    robot = await Robot.get_or_none(robot_id=robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Робот с ID {robot_id} не найден",
        )

    # Обновляем поля, если они есть в запросе
    update_dict = {}

    if update_data.name is not None:
        update_dict["name"] = update_data.name

    if update_data.status is not None:
        update_dict["status"] = update_data.status

    if update_data.battery_level is not None:
        update_dict["battery_level"] = update_data.battery_level

    if update_data.location is not None:
        update_dict["location"] = update_data.location.dict()

    if update_data.capabilities is not None:
        update_dict["capabilities"] = update_data.capabilities

    if update_data.active_task is not None:
        update_dict["active_task"] = update_data.active_task

    if update_data.last_maintenance is not None:
        update_dict["last_maintenance"] = update_data.last_maintenance

    if update_data.software_version is not None:
        update_dict["software_version"] = update_data.software_version

    # Обновляем робота, если есть что обновлять
    if update_dict:
        await robot.update_from_dict(update_dict).save()

    # Отправляем уведомление через WebSocket
    await broadcast_robot_update(robot, current_user)

    # Возвращаем обновленную информацию
    return await get_robot(robot_id, current_user)


@router.post("/{robot_id}/command", response_model=CommandResponse)
async def send_command(
    command_data: RobotCommandRequest,
    current_user: User = Depends(get_manager_user),
):
    """Отправка команды роботу"""
    robot = await Robot.get_or_none(robot_id=command_data.robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Робот с ID {command_data.robot_id} не найден",
        )

    # Проверяем состояние робота
    if robot.status == RobotStatus.ERROR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Робот находится в состоянии ошибки и не может выполнять команды",
        )

    # В зависимости от команды выполняем разные действия
    response_details = {}
    response_success = True
    response_message = "Команда выполнена успешно"

    try:
        if command_data.command == "start":
            # Запуск робота
            robot.status = RobotStatus.ACTIVE
            await robot.save()
            response_message = "Робот успешно запущен"

        elif command_data.command == "stop":
            # Остановка робота
            robot.status = RobotStatus.INACTIVE
            robot.active_task = None
            await robot.save()
            response_message = "Робот успешно остановлен"

        elif command_data.command == "charge":
            # Отправляем робота на зарядку
            robot.status = RobotStatus.CHARGING
            robot.active_task = "charging"
            await robot.save()
            response_message = "Робот отправлен на зарядку"

        elif command_data.command == "maintain":
            # Отправляем робота на техобслуживание
            robot.status = RobotStatus.MAINTENANCE
            robot.active_task = "maintenance"
            robot.last_maintenance = datetime.utcnow()
            await robot.save()
            response_message = "Робот отправлен на техобслуживание"

        elif command_data.command == "check":
            # Диагностика робота - возвращаем текущее состояние
            response_details = {
                "battery_level": robot.battery_level,
                "status": robot.status,
                "software_version": robot.software_version,
                "last_maintenance": (
                    robot.last_maintenance.isoformat()
                    if robot.last_maintenance
                    else None
                ),
            }
            response_message = "Выполнена диагностика робота"

        else:
            # Неизвестная команда
            logger.warning(f"Получена неизвестная команда: {command_data.command}")
            response_success = False
            response_message = f"Неизвестная команда: {command_data.command}"

        # Записываем лог выполнения команды
        await RobotLog.create(
            robot=robot,
            log_type="command",
            message=f"Команда: {command_data.command}",
            timestamp=datetime.utcnow(),
            details={
                "command": command_data.command,
                "params": command_data.params,
                "user_id": current_user.id,
                "success": response_success,
            },
        )

        # Отправляем уведомление через WebSocket
        await broadcast_robot_update(robot, current_user)

        return CommandResponse(
            success=response_success,
            message=response_message,
            details=response_details,
        )

    except Exception as e:
        logger.error(f"Ошибка при выполнении команды: {e}")
        return CommandResponse(
            success=False,
            message=f"Ошибка при выполнении команды: {str(e)}",
            details={"error": str(e)},
        )


@router.post("/group-command", response_model=CommandResponse)
async def send_group_command(
    command_data: GroupCommandRequest,
    current_user: User = Depends(get_manager_user),
):
    """Отправка команды группе роботов"""
    # Определяем, каким роботам отправлять команду
    robot_query = Robot.all()

    if command_data.robot_ids:
        # Если указаны конкретные ID роботов
        robot_query = robot_query.filter(robot_id__in=command_data.robot_ids)
    elif command_data.robot_type:
        # Если указан тип роботов
        robot_query = robot_query.filter(type=command_data.robot_type)

    # Получаем список роботов
    robots = await robot_query

    if not robots:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Не найдено роботов, соответствующих заданным параметрам",
        )

    # Счетчики успешных и неуспешных выполнений
    success_count = 0
    error_count = 0
    robot_results = []

    # Отправляем команду каждому роботу
    for robot in robots:
        try:
            # Создаем индивидуальный запрос для каждого робота
            individual_request = RobotCommandRequest(
                robot_id=robot.robot_id,
                command=command_data.command,
                params=command_data.params,
            )

            # Выполняем команду
            result = await send_command(individual_request, current_user)

            # Записываем результат
            robot_results.append(
                {
                    "robot_id": robot.robot_id,
                    "success": result.success,
                    "message": result.message,
                }
            )

            if result.success:
                success_count += 1
            else:
                error_count += 1

        except Exception as e:
            logger.error(f"Ошибка при отправке команды роботу {robot.robot_id}: {e}")
            robot_results.append(
                {
                    "robot_id": robot.robot_id,
                    "success": False,
                    "message": str(e),
                }
            )
            error_count += 1

    # Возвращаем общий результат
    return CommandResponse(
        success=error_count == 0,  # Успешно, если нет ошибок
        message=f"Команда отправлена {success_count} роботам, ошибок: {error_count}",
        details={
            "total": len(robots),
            "success_count": success_count,
            "error_count": error_count,
            "results": robot_results,
        },
    )


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate, current_user: User = Depends(get_manager_user)
):
    """Создание нового задания для робота"""
    # Проверяем, существует ли робот
    robot = await Robot.get_or_none(robot_id=task_data.robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Робот с ID {task_data.robot_id} не найден",
        )

    # Проверяем, поддерживает ли робот нужную функцию
    if task_data.capability not in robot.capabilities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Робот не поддерживает функцию {task_data.capability}",
        )

    # Создаем задание
    task = await RobotTask.create(
        robot=robot,
        task_name=task_data.task_name,
        capability=task_data.capability,
        scheduled_time=task_data.scheduled_time,
        params=task_data.params,
        priority=task_data.priority,
        created_by=current_user,
    )

    # Возвращаем созданное задание
    return TaskResponse(
        id=task.id,
        task_name=task.task_name,
        capability=task.capability,
        scheduled_time=task.scheduled_time,
        params=task.params,
        priority=task.priority,
        robot={
            "robot_id": robot.robot_id,
            "name": robot.name,
            "type": robot.type,
        },
        status=task.status,
        start_time=task.start_time,
        end_time=task.end_time,
        result=task.result,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/tasks", response_model=PaginatedResponse[TaskResponse])
async def get_tasks(
    query_params: TaskQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """Получение списка заданий с фильтрацией"""
    # Строим фильтры для запроса
    filters = {}

    # Применяем фильтры
    if query_params.robot_id:
        # Фильтр по ID робота - нужно получить робота и фильтровать по нему
        robot = await Robot.get_or_none(robot_id=query_params.robot_id)
        if robot:
            filters["robot_id"] = robot.id
        else:
            # Если робот не найден, возвращаем пустой список
            return PaginatedResponse[TaskResponse](
                items=[], total=0, page=pagination.page, size=pagination.size, pages=0
            )

    if query_params.status:
        filters["status"] = query_params.status

    if query_params.capability:
        filters["capability"] = query_params.capability

    if query_params.start_date:
        filters["scheduled_time__gte"] = query_params.start_date

    if query_params.end_date:
        filters["scheduled_time__lte"] = query_params.end_date

    # Получаем пагинированный список заданий с примененными фильтрами
    items, total, page, size, pages = await paginate(
        RobotTask.all().order_by("-scheduled_time").prefetch_related("robot"),
        pagination,
        filters,
    )

    # Преобразуем модели в схемы для API
    response_items = []
    for task in items:
        response_items.append(
            TaskResponse(
                id=task.id,
                task_name=task.task_name,
                capability=task.capability,
                scheduled_time=task.scheduled_time,
                params=task.params,
                priority=task.priority,
                robot={
                    "robot_id": task.robot.robot_id,
                    "name": task.robot.name,
                    "type": task.robot.type,
                },
                status=task.status,
                start_time=task.start_time,
                end_time=task.end_time,
                result=task.result,
                created_at=task.created_at,
                updated_at=task.updated_at,
            )
        )

    # Возвращаем пагинированный ответ
    return PaginatedResponse[TaskResponse](
        items=response_items, total=total, page=page, size=size, pages=pages
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int = Path(..., description="ID задания"),
    current_user: User = Depends(get_current_user),
):
    """Получение информации о конкретном задании"""
    task = await RobotTask.get_or_none(id=task_id).prefetch_related("robot")
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Задание с ID {task_id} не найдено",
        )

    return TaskResponse(
        id=task.id,
        task_name=task.task_name,
        capability=task.capability,
        scheduled_time=task.scheduled_time,
        params=task.params,
        priority=task.priority,
        robot={
            "robot_id": task.robot.robot_id,
            "name": task.robot.name,
            "type": task.robot.type,
        },
        status=task.status,
        start_time=task.start_time,
        end_time=task.end_time,
        result=task.result,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    update_data: TaskUpdate,
    task_id: int = Path(..., description="ID задания"),
    current_user: User = Depends(get_manager_user),
):
    """Обновление информации о задании"""
    task = await RobotTask.get_or_none(id=task_id).prefetch_related("robot")
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Задание с ID {task_id} не найдено",
        )

    # Обновляем поля, если они есть в запросе
    update_dict = {}

    if update_data.task_name is not None:
        update_dict["task_name"] = update_data.task_name

    if update_data.capability is not None:
        # Проверяем, поддерживает ли робот новую функцию
        if update_data.capability not in task.robot.capabilities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Робот не поддерживает функцию {update_data.capability}",
            )
        update_dict["capability"] = update_data.capability

    if update_data.status is not None:
        update_dict["status"] = update_data.status

    if update_data.scheduled_time is not None:
        update_dict["scheduled_time"] = update_data.scheduled_time

    if update_data.params is not None:
        update_dict["params"] = update_data.params

    if update_data.priority is not None:
        update_dict["priority"] = update_data.priority

    if update_data.result is not None:
        update_dict["result"] = update_data.result

    # Обновляем задание, если есть что обновлять
    if update_dict:
        await task.update_from_dict(update_dict).save()

    # Возвращаем обновленную информацию
    return await get_task(task_id, current_user)


@router.delete("/tasks/{task_id}", response_model=StatusMessage)
async def delete_task(
    task_id: int = Path(..., description="ID задания"),
    current_user: User = Depends(get_manager_user),
):
    """Удаление задания"""
    task = await RobotTask.get_or_none(id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Задание с ID {task_id} не найдено",
        )

    # Удаляем задание
    await task.delete()

    return StatusMessage(
        status="success", message=f"Задание с ID {task_id} успешно удалено"
    )


async def broadcast_robot_update(robot: Robot, user: User):
    """Отправляет обновления о роботе всем подключенным клиентам"""
    try:
        # Создаем сообщение для отправки
        message = {
            "event": "robot_update",
            "data": {
                "robot_id": robot.robot_id,
                "name": robot.name,
                "type": robot.type,
                "status": robot.status,
                "battery_level": robot.battery_level,
                "location": robot.location,
                "capabilities": robot.capabilities,
                "active_task": robot.active_task,
                "last_maintenance": (
                    robot.last_maintenance.isoformat()
                    if robot.last_maintenance
                    else None
                ),
                "software_version": robot.software_version,
                "updated_at": robot.updated_at.isoformat(),
            },
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user.id if user else None,
        }

        # Отправляем сообщение через менеджер WebSocket
        await manager.broadcast(WebSocketMessage(**message))

    except Exception as e:
        logger.error(f"Ошибка при отправке обновления по WebSocket: {e}")


async def create_test_robots(user: User):
    """Создает тестовых роботов для демонстрации"""
    # Дрон для мониторинга
    await Robot.create(
        robot_id="drone-001",
        name="Дрон для мониторинга",
        type=RobotType.DRONE,
        status=RobotStatus.ACTIVE,
        battery_level=85.5,
        location={"lat": 50.4501, "lng": 30.5234},
        capabilities=[
            RobotCapability.MONITORING,
            RobotCapability.SPRAYING,
        ],
        software_version="1.2.0",
        created_by=user,
    )

    # Наземный робот для анализа почвы
    await Robot.create(
        robot_id="ground-001",
        name="Почвенный анализатор",
        type=RobotType.GROUND,
        status=RobotStatus.INACTIVE,
        battery_level=32.0,
        location={"lat": 50.4522, "lng": 30.5266},
        capabilities=[
            RobotCapability.SOIL_ANALYSIS,
            RobotCapability.MONITORING,
        ],
        software_version="1.1.5",
        created_by=user,
    )

    # Многоцелевой робот
    await Robot.create(
        robot_id="multi-001",
        name="Многоцелевой робот",
        type=RobotType.MULTIPURPOSE,
        status=RobotStatus.CHARGING,
        battery_level=15.0,
        location={"lat": 50.4489, "lng": 30.5212},
        capabilities=[
            RobotCapability.HARVESTING,
            RobotCapability.PRUNING,
            RobotCapability.TRANSPORT,
        ],
        software_version="2.0.0",
        created_by=user,
    )
