# Guía: Autenticación JWT en NestJS (Passport)

Guía para construir el login con JWT y proteger rutas, en las dos formas que tienes en tus zips:

- **Forma 1 (`authPassport`)**: Passport simple. Login + `AuthGuard('jwt')`. Es la más corta.
- **Forma 2 (`auth`)**: Passport completo. `ConfigModule`, roles, guard propio y decorador `@Auth()`.
- **Bonus**: guard propio **sin Passport**, usando solo `JwtService`.

Las dos primeras usan `passport-jwt` por debajo; la diferencia es cuánto montas encima. Cada sección trae el código **corregido** y al final hay una tabla con los errores que encontré en tus zips.

## Índice

1. [Cómo funciona (idea general)](#1-cómo-funciona-idea-general)
2. [Instalación y variables de entorno](#2-instalación-y-variables-de-entorno)
3. [Preparar el módulo de usuarios](#3-preparar-el-módulo-de-usuarios)
4. [Forma 1: Passport simple](#4-forma-1-passport-simple-authpassport)
5. [Forma 2: Passport completo con roles](#5-forma-2-passport-completo-con-roles-auth)
6. [Bonus: sin Passport](#6-bonus-guard-propio-sin-passport)
7. [Proteger las rutas del proyecto](#7-proteger-las-rutas-del-proyecto-hotel-room-booking)
8. [Probar con curl / Postman](#8-probar-con-curl--postman)
9. [Tests](#9-tests)
10. [Errores comunes](#10-errores-comunes)
11. [Checklist](#11-checklist)

---

## 1. Cómo funciona (idea general)

```
 LOGIN                                   RUTA PROTEGIDA
 ─────                                   ──────────────
 POST /auth/login                        GET /algo
 { email, password }                     Authorization: Bearer <token>
        │                                        │
        ▼                                        ▼
 AuthService busca el usuario            AuthGuard('jwt')
 y compara la contraseña (bcrypt)                │
        │                                        ▼
        ▼                                JwtStrategy
 jwtService.sign(payload)                 ├─ saca el token del header
        │                                 ├─ verifica firma y expiración
        ▼                                 └─ validate(payload) → devuelve el usuario
 { token: "eyJhbGci..." }                        │
                                                 ▼
                                         req.user = ese usuario
                                         (ya llega al controlador)
```

Las piezas:

| Pieza | Qué hace |
|---|---|
| `JwtModule` / `JwtService` | **Crea** (`sign`) y **verifica** (`verify`) tokens |
| `PassportModule` | Conecta Passport con Nest |
| `JwtStrategy` | Le dice a Passport **cómo** leer y validar el token. Su `validate()` decide qué queda en `req.user` |
| `AuthGuard('jwt')` | Guard que **ejecuta** la estrategia antes de entrar a la ruta |
| `AuthService` | Lógica de login: valida credenciales y firma el token |
| `bcrypt` | Compara contraseñas contra su hash |

> Un JWT **no está cifrado**, solo firmado. Cualquiera puede leer su contenido. Nunca metas contraseñas ni datos sensibles en el payload; con el `id` basta.

---

## 2. Instalación y variables de entorno

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/config class-validator class-transformer
pnpm add -D @types/passport-jwt @types/bcrypt
```

Archivo `.env` en la raíz del proyecto (y agrégalo al `.gitignore`):

```env
JWT_SECRET=pon-aqui-una-cadena-larga-y-aleatoria
JWT_EXPIRES_IN=600
```

`JWT_EXPIRES_IN` está en **segundos** (600 = 10 minutos).

Carga la configuración **una sola vez**, de forma global, en `app.module.ts`:

```typescript
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ...TypeOrmModule, UserModule, AuthModule, etc.
  ],
})
export class AppModule {}
```

Y activa la validación de DTOs en `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

---

## 3. Preparar el módulo de usuarios

El auth depende de `UserService`. Necesitas esto:

**`user.module.ts`**: exportar el servicio (si no, `AuthModule` no puede inyectarlo):

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],   // 👈 imprescindible
})
export class UserModule {}
```

**`user.entity.ts`**: `password` y, para la Forma 2, `roles`:

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;               // aquí va el HASH, nunca el texto plano

  @Column('simple-array', { default: 'user' })
  roles: string[];                // ['user'], ['admin', 'editor']...
}
```

**`user.service.ts`**: los métodos que usa el auth, y **hashear la contraseña al registrar**:

```typescript
import * as bcrypt from 'bcrypt';

async create(dto: CreateUserDto): Promise<User> {
  const user = this.usersRepository.create({
    ...dto,
    password: await bcrypt.hash(dto.password, 10),   // 10 = rondas de salt
  });
  return this.usersRepository.save(user);
}

findOne(email: string): Promise<User | null> {
  return this.usersRepository.findOne({ where: { email } });
}

findById(id: number): Promise<User | null> {
  return this.usersRepository.findOne({ where: { id } });
}
```

> Si guardas usuarios con la contraseña en texto plano, el login **nunca** va a funcionar, porque `bcrypt.compare` espera un hash. Crea los usuarios de prueba por el `create`, no a mano en la base.

---

## 4. Forma 1: Passport simple (`authPassport`)

Estructura:

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
└── jwt.strategy.ts
```

### `auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: Number(config.get('JWT_EXPIRES_IN') ?? 600) },
      }),
    }),
  ],
  controllers: [AuthController],          // 👈 en tu zip faltaba
  providers: [AuthService, JwtStrategy],  // 👈 AuthService también faltaba
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
```

Por qué `registerAsync` y no `register`: `JwtModule.register({ secret: process.env.JWT_SECRET })` se evalúa apenas se importa el archivo, **antes** de que `ConfigModule` cargue el `.env`. El secreto puede quedar `undefined`. `registerAsync` espera a que la configuración esté lista.

### `auth.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  // Devuelve el usuario sin password, o null si las credenciales son inválidas
  async validateUser(email: string, pass: string) {
    const user = await this.userService.findOne(email);
    if (!user) return null;

    const matches = await bcrypt.compare(pass, user.password);  // 👈 compare, no hash
    if (!matches) return null;

    const { password, ...result } = user;
    return result;
  }

  // Firma el token. Lo que viaja dentro es el payload
  async login(user: { id: number; email: string }) {
    const payload = { id: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
```

> **Por qué `compare` y no `hash`:** `bcrypt.hash(pass, 10)` devuelve una `Promise` y además genera un hash **distinto cada vez** (el salt es aleatorio), así que nunca será igual al guardado. `bcrypt.compare(pass, hashGuardado)` sabe extraer el salt del hash y comparar bien.

### `jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),  // el MISMO secreto que JwtModule
    });
  }

  // Se ejecuta solo si la firma y la expiración son válidas
  async validate(payload: { id: number; email: string }) {
    const user = await this.userService.findById(payload.id);
    if (!user) throw new UnauthorizedException('User does not exist');

    const { password, ...rest } = user;
    return rest;                       // 👈 esto queda en req.user
  }
}
```

Tu zip tenía un secreto de respaldo (`|| 'your-secret-ky'`) distinto al del módulo. Si `.env` falla, el token se firma con un secreto y se verifica con otro, y todo da 401. Con `getOrThrow` la app **no arranca** si falta el secreto, que es mucho mejor que fallar en silencio.

### `auth.controller.ts`

```typescript
import { Body, Controller, Get, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard('jwt'))      // 'jwt' = nombre de la estrategia de passport-jwt
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;                // lo que devolvió validate()
  }
}
```

**`dto/login.dto.ts`**:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

Con esto ya tienes login y una ruta protegida. Para proteger cualquier otra ruta: `@UseGuards(AuthGuard('jwt'))`.

---

## 5. Forma 2: Passport completo con roles (`auth`)

Todo lo anterior, más: `defaultStrategy`, roles y decoradores que evitan repetir código.

Estructura:

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── decorators/
│   ├── auth.decorator.ts              ← @Auth(...roles)  (el "todo en uno")
│   ├── role-protected.decorator.ts    ← @RoleProtected(...roles)
│   └── user/user.decorator.ts         ← @UserDecorator()
├── dto/login-user.dto.ts
├── guards/user-role/user-role.guard.ts
├── interfaces/app-roles.ts
└── strategies/jwt.strategy.ts
```

### `interfaces/app-roles.ts`

```typescript
export const META_ROLES = 'roles';

export enum AppRoles {
  admin = 'admin',
  user = 'user',
  superuser = 'superuser',
  editor = 'editor',
}
```

El enum evita errores de tipeo (`'admn'`) y da autocompletado.

### `auth.module.ts`

```typescript
@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),   // 👈 permite AuthGuard() sin argumentos
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: Number(config.get('JWT_EXPIRES_IN') ?? 600) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],    // 👈 en tu zip no exportaba nada
})
export class AuthModule {}
```

`ConfigModule.forRoot` ya no va aquí: va una vez en `AppModule` (ver sección 2).

### `dto/login-user.dto.ts`

```typescript
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginUserDto {
  @IsEmail()                       // 👈 en tu zip era @IsString + @Length(8,50) para el email
  readonly email: string;

  @IsString()
  @Length(8, 50)
  readonly password: string;
}
```

### `auth.service.ts`

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser({ email, password }: LoginUserDto) {
    const user = await this.userService.findOne(email);

    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Invalid credentials');

    return {
      user_id: user.id,
      email: user.email,
      roles: user.roles,
      token: this.jwtService.sign({ user_id: user.id }),
    };
  }
}
```

> **Importante:** en tu zip el método tenía un `try { ... } catch (error) { }` con el `catch` vacío. Eso se traga el `UnauthorizedException`: con credenciales malas la API respondía **200 con cuerpo vacío**. Sin `try/catch`, Nest convierte la excepción en un 401 solo.

### `strategies/jwt.strategy.ts`

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { user_id: number }) {
    const user = await this.userService.findById(payload.user_id);
    if (!user) throw new UnauthorizedException('User does not exist');

    const { password, ...userRet } = user;
    return userRet;                       // incluye roles → lo usa el guard
  }
}
```

### `guards/user-role/user-role.guard.ts`

Este guard corre **después** de `AuthGuard()` (que es quien llena `req.user`) y revisa si el usuario tiene alguno de los roles permitidos:

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from '../../interfaces/app-roles';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const validRoles = this.reflector.getAllAndOverride<string[]>(META_ROLES, [
      context.getHandler(),   // primero busca en el método
      context.getClass(),     // si no hay, en el controlador entero
    ]);

    if (!validRoles || validRoles.length === 0) return true;   // ruta sin restricción de rol

    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new UnauthorizedException('User not found in request');

    const hasRole = (user.roles ?? []).some((role: string) => validRoles.includes(role));
    if (!hasRole) throw new ForbiddenException(`User needs one of these roles: ${validRoles.join(', ')}`);

    return true;
  }
}
```

`Reflector` lee los metadatos que pone `@RoleProtected`. Tu versión usaba `reflector.get(..., getHandler())`, que solo mira el método. `getAllAndOverride` también permite poner el decorador en toda la clase.

### Decoradores

**`decorators/role-protected.decorator.ts`**: guarda los roles permitidos como metadato:

```typescript
import { SetMetadata } from '@nestjs/common';
import { META_ROLES } from '../interfaces/app-roles';

export const RoleProtected = (...roles: string[]) => SetMetadata(META_ROLES, roles);
```

**`decorators/auth.decorator.ts`**: junta todo en uno con `applyDecorators`:

```typescript
import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppRoles } from '../interfaces/app-roles';
import { RoleProtected } from './role-protected.decorator';
import { UserRoleGuard } from '../guards/user-role/user-role.guard';

export const Auth = (...roles: AppRoles[]) =>
  applyDecorators(
    RoleProtected(...roles),
    UseGuards(AuthGuard(), UserRoleGuard),   // orden importa: primero autenticar, luego roles
  );
```

**`decorators/user/user.decorator.ts`**: saca el usuario de `req.user` directo en el parámetro:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserDecorator = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user;
    return data ? user?.[data] : user;      // @UserDecorator('id') → solo el id
  },
);
```

### `auth.controller.ts`

```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginUser(loginUserDto);
  }

  @Get('me')
  @UseGuards(AuthGuard())                      // solo autenticado
  me(@UserDecorator() user: any) {
    return user;
  }
}
```

### Las 4 formas de proteger una ruta

Tus ejemplos `private1` a `private4` son la misma idea, cada vez con menos código:

```typescript
// 1) Solo autenticado
@UseGuards(AuthGuard())

// 2) Autenticado + roles, con SetMetadata a mano (propenso a errores de tipeo)
@UseGuards(AuthGuard(), UserRoleGuard)
@SetMetadata('roles', ['admin', 'editor'])

// 3) Igual, pero con el decorador propio
@UseGuards(AuthGuard(), UserRoleGuard)
@RoleProtected(AppRoles.admin, AppRoles.editor)

// 4) Todo en uno (la que debes usar)
@Auth(AppRoles.admin, AppRoles.user)
```

| Necesidad | Usa |
|---|---|
| Solo estar logueado | `@UseGuards(AuthGuard())` |
| Logueado y con cierto rol | `@Auth(AppRoles.admin)` |
| Obtener el usuario en el método | `@UserDecorator()` o `@UserDecorator('id')` |

---

## 6. Bonus: guard propio sin Passport

Si no quieres `passport` ni `passport-jwt`, un guard con `JwtService` hace lo mismo en una sola clase:

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Missing token');

    try {
      request.user = await this.jwtService.verifyAsync(token);   // payload ya verificado
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
```

Uso: `@UseGuards(JwtAuthGuard)`. Necesita `JwtModule` configurado (igual que arriba) e importado en el módulo donde lo uses.

| | Con Passport | Sin Passport |
|---|---|---|
| Dependencias | `passport`, `passport-jwt`, `@nestjs/passport` | solo `@nestjs/jwt` |
| Qué hay en `req.user` | Lo que devuelve `validate()` (puedes consultar la BD) | El payload tal cual (tú decides si consultas la BD) |
| Estándar en Nest | Muy usado, escala a otras estrategias (Google, local...) | La alternativa que muestra la doc oficial |

---

## 7. Proteger las rutas del proyecto (hotel, room, booking)

Con la Forma 2, protegerlas es agregar una línea.

```typescript
@Controller('hotels/:hotelId/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()                                   // público: cualquiera ve las habitaciones
  findAll(@Param('hotelId', ParseIntPipe) hotelId: number) {
    return this.roomService.findAll(hotelId);
  }

  @Post()
  @Auth(AppRoles.admin)                    // solo admin crea habitaciones
  create(@Param('hotelId', ParseIntPipe) hotelId: number, @Body() dto: CreateRoomDto) {
    return this.roomService.create(hotelId, dto);
  }

  @Delete(':id')
  @Auth(AppRoles.admin)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.delete(id);
  }
}
```

Lo mejor del `@UserDecorator`: el `userId` de la reserva sale **del token**, no del body. Así nadie puede reservar a nombre de otro:

```typescript
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Auth(AppRoles.user, AppRoles.admin)
  create(@UserDecorator('id') userId: number, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(userId, dto);   // firma que ya tienes
  }

  @Get('mine')
  @Auth(AppRoles.user, AppRoles.admin)
  mine(@UserDecorator('id') userId: number) {
    return this.bookingService.findByUser(userId);
  }
}
```

Para que `@Auth()` funcione en esos controladores, `AuthModule` debe estar cargado en la app (importado en `AppModule`). Si además necesitas `JwtService` en otro módulo, impórtalo ahí: `AuthModule` ya exporta `JwtModule` y `PassportModule`.

---

## 8. Probar con curl / Postman

**1) Login** (en PowerShell usa `curl.exe`, porque `curl` es un alias de otro comando):

```bash
curl.exe -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"12345678\"}"
```

Respuesta (Forma 2):

```json
{ "user_id": 1, "email": "admin@test.com", "roles": ["admin"], "token": "eyJhbGciOi..." }
```

**2) Ruta protegida**: manda el token en el header:

```bash
curl.exe http://localhost:3000/auth/me -H "Authorization: Bearer eyJhbGciOi..."
```

En Postman: pestaña **Authorization** → tipo **Bearer Token** → pega el token.

Qué respuesta esperar:

| Situación | Código |
|---|---|
| Token válido y rol correcto | 200 |
| Sin header, token mal escrito o expirado | 401 |
| Token válido pero sin el rol requerido | 403 |
| Credenciales incorrectas en login | 401 |
| Body inválido (email sin formato) | 400 |

Puedes pegar el token en [jwt.io](https://jwt.io) para ver el payload y la fecha de expiración (`exp`).

---

## 9. Tests

Tus `*.spec.ts` generados solo tienen `should be defined`, y **fallan** porque `AuthService` necesita `UserService` y `JwtService` y el test no los provee. Se resuelve igual que con el repositorio: mocks.

### `auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService;
  let mockJwtService;

  beforeEach(async () => {
    mockUserService = { findOne: jest.fn(), findById: jest.fn() };
    mockJwtService = { sign: jest.fn().mockReturnValue('fake-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return a token with valid credentials', async () => {
    mockUserService.findOne.mockResolvedValue({
      id: 1,
      email: 'a@a.com',
      roles: ['user'],
      password: bcrypt.hashSync('12345678', 10),   // hash real para que compare funcione
    });

    const result = await service.loginUser({ email: 'a@a.com', password: '12345678' });

    expect(result.token).toBe('fake-token');
    expect(mockJwtService.sign).toHaveBeenCalledWith({ user_id: 1 });
  });

  it('should throw UnauthorizedException with a wrong password', async () => {
    mockUserService.findOne.mockResolvedValue({
      id: 1,
      password: bcrypt.hashSync('otra-clave', 10),
    });

    await expect(
      service.loginUser({ email: 'a@a.com', password: '12345678' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when the user does not exist', async () => {
    mockUserService.findOne.mockResolvedValue(null);

    await expect(
      service.loginUser({ email: 'x@x.com', password: '12345678' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

> Este test depende de que **no** tengas el `try/catch` vacío del zip: con él, `loginUser` no lanza nada y los dos últimos tests fallarían.

### `user-role.guard.spec.ts`

Tu spec hace `new UserRoleGuard()`, pero ahora el constructor pide un `Reflector`:

```typescript
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleGuard } from './user-role.guard';

describe('UserRoleGuard', () => {
  let guard: UserRoleGuard;
  let reflector: Reflector;

  // Contexto falso con el usuario que queramos
  const buildContext = (user: any) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new UserRoleGuard(reflector);
  });

  it('should allow when the route has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(buildContext({ roles: [] }))).toBe(true);
  });

  it('should allow when the user has a valid role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(buildContext({ roles: ['admin'] }))).toBe(true);
  });

  it('should throw ForbiddenException when the user lacks the role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() => guard.canActivate(buildContext({ roles: ['user'] }))).toThrow(ForbiddenException);
  });
});
```

---

## 10. Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| Siempre "Invalid credentials" aunque la clave sea correcta | `bcrypt.hash` en vez de `bcrypt.compare`, o la contraseña se guardó en texto plano | Usar `bcrypt.compare` y crear usuarios con `bcrypt.hash` |
| Login con clave errónea responde **200 vacío** | `catch` vacío en `loginUser` | Quitar el `try/catch` |
| `Unknown authentication strategy "jwt"` | `JwtStrategy` no está en `providers`, o `AuthModule` no está importado en `AppModule` | Registrarlos |
| `JwtStrategy requires a secret or key` | `JWT_SECRET` llega `undefined` o `''` (`.env` no cargado) | `ConfigModule.forRoot({ isGlobal: true })` en `AppModule` y `.env` en la raíz |
| 401 con un token recién emitido | La estrategia verifica con un secreto distinto al que firmó | Un solo `JWT_SECRET`, sin valores de respaldo diferentes |
| 401 pasado un rato | El token expiró | Es lo esperado; ajustar `JWT_EXPIRES_IN` o volver a loguearse |
| Los tokens siempre duran 600 s | En tu zip: `configService.get('JWT_EXPIRES_IN') \| 600` usa el operador **bit a bit** `\|` | Usar `??` o `\|\|` |
| `Cannot POST /auth/login` (404) | `AuthController` no está en `controllers` del módulo | Agregarlo |
| `Nest can't resolve dependencies of AuthService (UserService...)` | `UserModule` no exporta `UserService` | `exports: [UserService]` |
| `user.roles is not iterable` | La entidad no tiene `roles`, o llega `undefined` | Columna `roles` con default; en el guard `user.roles ?? []` |
| 403 teniendo el rol | Rol escrito distinto en la BD y en el enum (`'Admin'` vs `'admin'`) | Mismos valores en ambos lados |
| 400 en login con un correo corto | `@Length(8,50)` aplicado al email | Usar `@IsEmail()` |
| `Cannot find module 'src/...'` en Jest | Import absoluto | Imports relativos (`../user/user.service`) |
| Test del guard falla al compilar | `new UserRoleGuard()` sin `Reflector` | `new UserRoleGuard(new Reflector())` |

---

## 11. Checklist

**Base**
- [ ] Paquetes instalados (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@nestjs/config`)
- [ ] `.env` con `JWT_SECRET` (y `JWT_EXPIRES_IN`), y en el `.gitignore`
- [ ] `ConfigModule.forRoot({ isGlobal: true })` en `AppModule`
- [ ] `ValidationPipe` global en `main.ts`

**Usuarios**
- [ ] `UserModule` exporta `UserService`
- [ ] `create` hashea la contraseña con `bcrypt.hash`
- [ ] `findOne(email)` y `findById(id)` implementados
- [ ] Entidad con `password` (y `roles` si usas la Forma 2)

**Auth**
- [ ] `JwtModule.registerAsync` con el secreto del `.env`
- [ ] `AuthService`, `AuthController` y `JwtStrategy` registrados en `AuthModule`
- [ ] `login` usa `bcrypt.compare` y lanza `UnauthorizedException`
- [ ] `JwtStrategy.validate` busca el usuario y quita el `password`
- [ ] `AuthModule` importado en `AppModule` y exporta `JwtModule` y `PassportModule`

**Forma 2 (roles)**
- [ ] `AppRoles` y `META_ROLES`
- [ ] `UserRoleGuard`, `@RoleProtected`, `@Auth`, `@UserDecorator`
- [ ] Rutas sensibles con `@Auth(...)`

**Pruebas**
- [ ] Login probado con curl/Postman (200, 401, 403)
- [ ] Specs con mocks de `UserService` y `JwtService`