import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateEvent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    eventId: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().optional(),
    yes: Joi.number().required(),
    no: Joi.number().required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  next();
};
