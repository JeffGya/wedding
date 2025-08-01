

import Joi from 'joi';

const translationSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Title is required.'
  })
});

const blockSchema = Joi.object({
  id: Joi.number().integer().optional(),
  type: Joi.string().valid('richText','image','video','map','divider','survey').required(),
  translations: Joi.object({
    en: Joi.object({
      html: Joi.when('type', {
        is: 'richText',
        then: Joi.string().trim().required().messages({'any.required':'Rich text content is required.'}),
        otherwise: Joi.optional()
      }),
      src: Joi.when('type', {
        is: 'image',
        then: Joi.string().uri().required().messages({'any.required':'Image URL is required.'}),
        otherwise: Joi.optional()
      }),
      alt: Joi.when('type', {
        is: 'image',
        then: Joi.string().trim().allow('').required(),
        otherwise: Joi.optional()
      }),
      embed: Joi.when('type', {
        is: Joi.valid('video','map'),
        then: Joi.string().uri().required().messages({'any.required':'Embed URL is required.'}),
        otherwise: Joi.optional()
      }),
      id: Joi.when('type', {
        is: 'survey',
        then: Joi.number().integer().required().messages({'any.required':'Survey selection is required.'}),
        otherwise: Joi.optional()
      })
    }).required(),
    lt: Joi.object({
      html: Joi.when('type', {
        is: 'richText', then: Joi.string().trim().required(), otherwise: Joi.optional()
      }),
      src: Joi.when('type', {
        is: 'image', then: Joi.string().uri().required(), otherwise: Joi.optional()
      }),
      alt: Joi.when('type', {
        is: 'image', then: Joi.string().trim().allow('').required(), otherwise: Joi.optional()
      }),
      embed: Joi.when('type', {
        is: Joi.valid('video','map'), then: Joi.string().uri().required(), otherwise: Joi.optional()
      }),
      id: Joi.when('type', {
        is: 'survey', then: Joi.number().integer().required(), otherwise: Joi.optional()
      })
    }).required()
  }).required()
});

const pageFormSchema = Joi.object({
  slug: Joi.string().pattern(/^[a-z0-9\-]+$/).required().messages({
    'string.empty': 'Slug is required.',
    'string.pattern.base': 'Slug may only contain lowercase letters, numbers, and hyphens.'
  }),
  translations: Joi.object({
    en: translationSchema,
    lt: translationSchema
  }).required(),
  blocks: Joi.array().items(blockSchema).required().min(1).messages({
    'array.min': 'At least one block is required.'
  })
});

export default pageFormSchema;