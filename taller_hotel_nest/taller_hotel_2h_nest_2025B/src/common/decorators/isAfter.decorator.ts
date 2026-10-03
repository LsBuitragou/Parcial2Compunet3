/* eslint-disable */
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsAfter(property: string, validationOptions?: ValidationOptions,) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          // Si falta alguna de las dos, dejamos que @IsDate / @IsNotEmpty se encarguen
          if (!value || !relatedValue) return true;

          const end = new Date(value);
          const start = new Date(relatedValue);

          if (isNaN(end.getTime()) || isNaN(start.getTime())) return false;

          return end.getTime() > start.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} debe ser posterior a ${relatedPropertyName}`;
        },
      },
    });
  };
}