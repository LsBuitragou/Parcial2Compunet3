# Guía rápida: CRUDs con NestJS (`@nestjs/common`) y TypeORM

Referencia para construir servicios CRUD como `RoomService`, `HotelService` y `BookingService`.

## Índice

1. [Imports básicos](#1-imports-básicos)
2. [Anatomía de un servicio CRUD](#2-anatomía-de-un-servicio-crud)
3. [Métodos del `Repository`](#3-métodos-del-repository)
4. [Opciones de búsqueda (`find`)](#4-opciones-de-búsqueda-find)
5. [Operadores de TypeORM](#5-operadores-de-typeorm)
6. [Relaciones entre entidades](#6-relaciones-entre-entidades)
7. [Excepciones de `@nestjs/common`](#7-excepciones-de-nestjscommon)
8. [Decoradores de `@nestjs/common` para controladores](#8-decoradores-de-nestjscommon-para-controladores)
9. [Pipes de validación](#9-pipes-de-validación)
10. [Patrones útiles](#10-patrones-útiles)
11. [Cómo se conecta con los tests](#11-cómo-se-conecta-con-los-tests)
12. [Errores comunes](#12-errores-comunes)

---

## 1. Imports básicos

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThan,
  MoreThan,
  Like,
  In,
} from 'typeorm';
```

| Import | Para qué sirve |
|---|---|
| `Injectable` | Marca la clase como servicio que Nest puede inyectar |
| `InjectRepository` | Inyecta el repositorio de una entidad |
| `Repository` | Tipo con todos los métodos para hablar con la tabla |
| `NotFoundException`, `BadRequestException`, ... | Errores HTTP listos para lanzar |
| `Optional` | Permite que una dependencia no exista (útil en tests) |
| `Between`, `LessThan`, `Like`, `In`... | Operadores para filtros en `where` |

---

## 2. Anatomía de un servicio CRUD

### Entidad

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomNumber: string;

  @Column('decimal')
  pricePerNight: number;

  @Column({ default: true })
  available: boolean;

  @ManyToOne(() => Hotel, (hotel) => hotel.rooms)
  hotel: Hotel;

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings: Booking[];
}
```

### Servicio

```typescript
@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  // CREATE
  async create(hotelId: number, dto: CreateRoomDto): Promise<Room> {
    const room = this.roomsRepository.create({ ...dto, hotel: { id: hotelId } });
    return this.roomsRepository.save(room);
  }

  // READ (lista)
  async findAll(hotelId: number): Promise<Room[]> {
    return this.roomsRepository.find({ where: { hotel: { id: hotelId } } });
  }

  // READ (uno)
  async findOne(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: ['hotel', 'bookings'],
    });
    if (!room) throw new NotFoundException(`Room with id ${id} not found`);
    return room;
  }

  // UPDATE
  async update(id: number, data: Partial<CreateRoomDto>): Promise<Room> {
    await this.roomsRepository.update(id, data);
    const room = await this.roomsRepository.findOne({ where: { id } });
    if (!room) throw new NotFoundException(`Room with id ${id} not found`);
    return room;
  }

  // DELETE
  async delete(id: number): Promise<boolean> {
    const result = await this.roomsRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
```

---

## 3. Métodos del `Repository`

### Crear y guardar

| Método | Qué hace | Devuelve |
|---|---|---|
| `create(data)` | Crea la instancia **en memoria** (no toca la BD) | Entidad |
| `save(entity)` | Inserta si no tiene `id`, actualiza si lo tiene | Entidad guardada |
| `insert(data)` | Inserta directo, sin cargar la entidad | `InsertResult` |

```typescript
const room = this.roomsRepository.create({ roomNumber: '101' }); // en memoria
await this.roomsRepository.save(room);                            // ahora sí a la BD
```

### Leer

| Método | Qué hace | Devuelve |
|---|---|---|
| `find(options)` | Todos los que cumplan la condición | `Entity[]` |
| `findOne(options)` | El primero que cumpla | `Entity \| null` |
| `findOneBy(where)` | Atajo de `findOne` solo con `where` | `Entity \| null` |
| `findBy(where)` | Atajo de `find` solo con `where` | `Entity[]` |
| `findAndCount(options)` | Lista + total (ideal para paginación) | `[Entity[], number]` |
| `count(options)` | Cuántos hay | `number` |
| `exists(options)` | Si existe al menos uno | `boolean` |

```typescript
const room  = await this.roomsRepository.findOneBy({ id: 1 });
const total = await this.roomsRepository.count({ where: { available: true } });
```

### Actualizar

| Método | Qué hace | Devuelve |
|---|---|---|
| `update(id, data)` | UPDATE directo (1 consulta, sin cargar la entidad) | `UpdateResult` (`affected`) |
| `save(entity)` | Actualiza una entidad ya cargada | Entidad |
| `increment(where, col, n)` | Suma `n` a una columna | `UpdateResult` |
| `decrement(where, col, n)` | Resta `n` a una columna | `UpdateResult` |

```typescript
// Dos estilos para actualizar:

// A) update directo: rápido, devuelve solo { affected }
await this.roomsRepository.update(id, { available: false });

// B) cargar, modificar y guardar: permite validar antes
const room = await this.roomsRepository.findOneBy({ id });
Object.assign(room, data);
await this.roomsRepository.save(room);
```

### Eliminar

| Método | Qué hace | Devuelve |
|---|---|---|
| `delete(id \| where)` | DELETE directo | `DeleteResult` (`affected`) |
| `remove(entity)` | Elimina una entidad ya cargada | Entidad |
| `softDelete(id)` | Marca `deletedAt` en vez de borrar (requiere `@DeleteDateColumn`) | `UpdateResult` |
| `restore(id)` | Revierte un soft delete | `UpdateResult` |

```typescript
const result = await this.roomsRepository.delete(id);
return (result.affected ?? 0) > 0; // true si borró algo
```

> `affected` puede ser `null` o `undefined` según el driver de BD, por eso `?? 0`.

---

## 4. Opciones de búsqueda (`find`)

```typescript
await this.roomsRepository.find({
  where: { available: true, hotel: { id: 1 } },  // filtros
  relations: ['hotel', 'bookings'],              // JOINs a cargar
  select: ['id', 'roomNumber'],                  // solo estas columnas
  order: { pricePerNight: 'ASC' },               // ordenar
  skip: 0,                                       // saltar N (paginación)
  take: 10,                                      // traer N (paginación)
});
```

### `where` con AND y OR

```typescript
// AND: todos los campos en el mismo objeto
where: { available: true, type: 'double' }

// OR: un arreglo de objetos
where: [
  { type: 'double' },
  { type: 'single' },
]
```

### Paginación

```typescript
async findPage(page: number, limit: number) {
  const [items, total] = await this.roomsRepository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { id: 'ASC' },
  });
  return { items, total, pages: Math.ceil(total / limit) };
}
```

---

## 5. Operadores de TypeORM

Se usan dentro de `where`.

| Operador | Significado | Ejemplo |
|---|---|---|
| `Equal(x)` | Igual | `price: Equal(100)` |
| `Not(x)` | Distinto | `status: Not('cancelled')` |
| `LessThan(x)` | `<` | `price: LessThan(200)` |
| `LessThanOrEqual(x)` | `<=` | `price: LessThanOrEqual(200)` |
| `MoreThan(x)` | `>` | `price: MoreThan(50)` |
| `MoreThanOrEqual(x)` | `>=` | `price: MoreThanOrEqual(50)` |
| `Between(a, b)` | Entre `a` y `b` | `checkInDate: Between(d1, d2)` |
| `In([...])` | Está en la lista | `type: In(['single', 'double'])` |
| `Like('%x%')` | Coincidencia de texto | `name: Like('%Hotel%')` |
| `ILike('%x%')` | Igual que `Like` pero sin distinguir mayúsculas (Postgres) | `name: ILike('%hotel%')` |
| `IsNull()` | Es `NULL` | `deletedAt: IsNull()` |

```typescript
// Habitaciones de 100 a 200 que no estén canceladas
await this.roomsRepository.find({
  where: {
    pricePerNight: Between(100, 200),
    status: Not('cancelled'),
  },
});
```

### Detectar choque de fechas (ejemplo de `BookingService`)

Dos rangos se solapan si cada uno empieza antes de que el otro termine:

```typescript
const conflicts = await this.bookingsRepository.count({
  where: {
    room: { id: roomId },
    checkInDate: LessThan(checkOutDate),   // empieza antes de que termine el mío
    checkOutDate: MoreThan(checkInDate),   // termina después de que empiece el mío
  },
});
return conflicts === 0; // true = disponible
```

---

## 6. Relaciones entre entidades

| Decorador | Relación | Ejemplo |
|---|---|---|
| `@OneToMany` | Uno a muchos | Un hotel tiene muchas habitaciones |
| `@ManyToOne` | Muchos a uno | Una habitación pertenece a un hotel (guarda la FK) |
| `@OneToOne` | Uno a uno | Un usuario tiene un perfil |
| `@ManyToMany` | Muchos a muchos | Reservas y servicios extra |

### Asignar una relación sin cargarla

Para guardar la FK basta con pasar el `id`:

```typescript
this.roomsRepository.create({ ...dto, hotel: { id: hotelId } });
```

### Filtrar por una relación

```typescript
where: { hotel: { id: hotelId } }
```

### Cargar relaciones

```typescript
relations: ['hotel', 'bookings']
// o anidadas:
relations: { bookings: { user: true } }
```

> Sin `relations`, campos como `room.bookings` llegan `undefined`.

---

## 7. Excepciones de `@nestjs/common`

Si las lanzas (`throw`) dentro de un servicio o controlador, Nest las convierte automáticamente en respuestas HTTP.

| Excepción | HTTP | Cuándo usarla |
|---|---|---|
| `BadRequestException` | 400 | Datos inválidos (ej. check-out antes del check-in) |
| `UnauthorizedException` | 401 | No autenticado |
| `ForbiddenException` | 403 | Autenticado pero sin permiso |
| `NotFoundException` | 404 | El registro no existe |
| `ConflictException` | 409 | Choque con algo existente (email repetido, fechas ocupadas) |
| `UnprocessableEntityException` | 422 | Datos bien formados pero que no cumplen reglas de negocio |
| `InternalServerErrorException` | 500 | Error inesperado del servidor |

```typescript
if (!room) {
  throw new NotFoundException(`Room with id ${id} not found`);
}

if (dto.checkOutDate <= dto.checkInDate) {
  throw new BadRequestException('check out date must be after check in date');
}

if (await this.hasDateConflict(...)) {
  throw new ConflictException('Booking in these days already exists');
}
```

Respuesta que recibe el cliente:

```json
{ "statusCode": 404, "message": "Room with id 5 not found", "error": "Not Found" }
```

---

## 8. Decoradores de `@nestjs/common` para controladores

```typescript
import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';

@Controller('hotels/:hotelId/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomService.create(hotelId, dto);
  }

  @Get()
  findAll(@Param('hotelId', ParseIntPipe) hotelId: number) {
    return this.roomService.findAll(hotelId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateRoomDto>,
  ) {
    return this.roomService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.delete(id);
  }
}
```

| Decorador | Función |
|---|---|
| `@Controller('ruta')` | Prefijo de rutas del controlador |
| `@Get() @Post() @Put() @Patch() @Delete()` | Método HTTP |
| `@Param('id')` | Parámetro de la URL (`/rooms/5`) |
| `@Query('page')` | Query string (`/rooms?page=2`) |
| `@Body()` | Cuerpo de la petición |
| `@HttpCode(204)` | Cambia el código de estado de la respuesta |

### Cuándo usar `PUT` y cuándo `PATCH`

- `PUT`: reemplaza el recurso completo.
- `PATCH`: modifica solo los campos enviados (lo habitual para `update`).

---

## 9. Pipes de validación

| Pipe | Hace |
|---|---|
| `ParseIntPipe` | Convierte el parámetro a número (error 400 si no es número) |
| `ParseBoolPipe` | Convierte a booleano |
| `ParseUUIDPipe` | Valida que sea un UUID |
| `DefaultValuePipe(10)` | Valor por defecto si no llega |
| `ValidationPipe` | Valida el DTO con `class-validator` |

```typescript
@Get()
findPage(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
) { ... }
```

### Validar DTOs

Instalar:

```bash
pnpm add class-validator class-transformer
```

Activar de forma global en `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

Definir el DTO:

```typescript
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @IsOptional()
  @IsString()
  description?: string;
}
```

> `whitelist: true` elimina del body los campos que no estén en el DTO.
> `transform: true` convierte los tipos (por ejemplo, string de fecha a `Date`).

---

## 10. Patrones útiles

### Verificar que existe antes de operar

```typescript
async findOne(id: number): Promise<Room> {
  const room = await this.roomsRepository.findOne({ where: { id } });
  if (!room) throw new NotFoundException(`Room with id ${id} not found`);
  return room;
}

async remove(id: number) {
  await this.findOne(id); // si no existe, lanza 404
  return this.roomsRepository.delete(id);
}
```

Reutilizar `findOne` evita repetir el `if (!room)` en cada método.

### Evitar duplicados

```typescript
const exists = await this.roomsRepository.exists({
  where: { roomNumber: dto.roomNumber, hotel: { id: hotelId } },
});
if (exists) throw new ConflictException('Room number already exists in this hotel');
```

### Calcular un valor derivado antes de guardar

```typescript
const msPerDay = 24 * 60 * 60 * 1000;
const days = Math.round(
  Math.abs(dto.checkOutDate.getTime() - dto.checkInDate.getTime()) / msPerDay,
);
const totalPrice = days * room.pricePerNight;
```

### Cambiar un estado (en vez de borrar)

```typescript
async cancel(id: number): Promise<Booking> {
  const booking = await this.findOne(id);
  booking.status = 'cancelled';
  return this.bookingsRepository.save(booking);
}
```

### `QueryBuilder` (consultas complejas)

Útil cuando `find` se queda corto (joins condicionales, agrupaciones, sumas):

```typescript
const rooms = await this.roomsRepository
  .createQueryBuilder('room')
  .leftJoinAndSelect('room.bookings', 'booking')
  .where('room.hotelId = :hotelId', { hotelId })
  .andWhere('room.pricePerNight BETWEEN :min AND :max', { min: 100, max: 200 })
  .orderBy('room.pricePerNight', 'ASC')
  .getMany();
```

Siempre pasa los valores con `:parametro` (nunca concatenes strings) para evitar inyección SQL.

### Transacciones

Cuando varias operaciones deben salir bien **todas o ninguna**:

```typescript
import { DataSource } from 'typeorm';

constructor(private dataSource: DataSource) {}

async createBookingAndUpdateRoom(...) {
  await this.dataSource.transaction(async (manager) => {
    await manager.save(booking);
    await manager.update(Room, roomId, { available: false });
  });
}
```

### Dependencia opcional (`@Optional`)

```typescript
constructor(
  @InjectRepository(Booking) private bookingsRepository: Repository<Booking>,
  @Optional() private readonly roomService: RoomService,
) {}
```

Si `RoomService` no está registrado, llega `undefined` en vez de romper. Úsalo con cuidado: tendrás que comprobar `if (this.roomService)` antes de usarlo.

---

## 11. Cómo se conecta con los tests

El test reemplaza el repositorio real por un mock. **El servicio solo funciona en el test si llama a los métodos que el test configuró.**

```typescript
mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
```

| Si el servicio usa... | El test debe mockear... |
|---|---|
| `repository.create()` + `save()` | `create.mockReturnValue(...)` y `save.mockResolvedValue(...)` |
| `repository.find()` | `find.mockResolvedValue([...])` |
| `repository.findOne()` | `findOne.mockResolvedValue(obj \| null)` |
| `repository.update()` + `findOne()` | `update.mockResolvedValue({ affected: 1 })` y `findOne.mockResolvedValue(obj)` |
| `repository.delete()` | `delete.mockResolvedValue({ affected: 1 })` |
| `repository.count()` | `count.mockResolvedValue(0)` (¡hay que agregar `count: jest.fn()`!) |

Reglas prácticas:

- Un método mockeado sin `mockResolvedValue` devuelve `undefined`.
- Un método que **no está** en el objeto mock lanza `is not a function`.
- Un servicio que el test no registra en `providers` llega `undefined` al constructor.

---

## 12. Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `Cannot read properties of undefined (reading 'x')` en el resultado | El servicio devuelve `undefined` (falta `return`, o un mock sin valor) | Revisar el `return` y los mocks |
| `X is not a function` | El método no existe en la clase o en el mock | Crear el método o agregarlo al mock |
| `Cannot find module 'src/...'` en Jest | Import absoluto que Jest no resuelve | Usar rutas relativas (`../booking/booking.service`) |
| `Nest can't resolve dependencies of X` | Falta registrar un provider o hay dependencia circular | Agregarlo en `providers` / `imports`, o rediseñar |
| `room.bookings` es `undefined` | No se cargó la relación | Agregar `relations: ['bookings']` |
| `affected` es `undefined` | El driver no lo informa | Usar `(result.affected ?? 0) > 0` |
| `save` inserta uno nuevo en vez de actualizar | La entidad no trae `id` | Cargar primero con `findOne` |
| Dependencia circular `A → B → A` | Dos servicios se importan entre sí | Que uno consulte el repositorio, o usar `forwardRef` como último recurso |

---

## Checklist para un CRUD nuevo

- [ ] Entidad con `@Entity`, columnas y relaciones
- [ ] DTO de creación con validaciones (`class-validator`)
- [ ] Servicio con `@Injectable` y `@InjectRepository`
- [ ] `create`, `findAll`, `findOne`, `update`, `delete`
- [ ] `NotFoundException` cuando no existe el registro
- [ ] Controlador con `ParseIntPipe` en los `@Param`
- [ ] Módulo con `TypeOrmModule.forFeature([Entidad])`
- [ ] Test con el repositorio mockeado