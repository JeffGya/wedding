import * as yup from 'yup';
import i18n from '@/i18n';
/**
 * Builds the Yup validation schema for the RSVP form.
 * @param {Object} options
 * @param {boolean} options.plusOneAllowed - Whether the guest is allowed to bring a plus-one.
 * @returns {yup.ObjectSchema}
 */
export function createRsvpSchema({ plusOneAllowed }) {
    // Base schema shape
    const shape = {
      attending: yup
        .boolean()
        .required(i18n.global.t('rsvp.attendingRequired')),
      dietary: yup
        .string()
        .nullable()
        .notRequired()
        .transform(value => (value === '' ? null : value))
        .when([], {
          is: (val) => !!val,
          then: (schema) =>
            schema.matches(/^[^<>[\]{}$%^=*|\\~`]+$/, i18n.global.t('rsvp.noCodeChars')),
        }),
      notes: yup
        .string()
        .nullable()
        .max(500, i18n.global.t('rsvp.notesMax'))
        .notRequired()
        .transform(value => (value === '' ? null : value))
        .when([], {
          is: (val) => !!val,
          then: (schema) =>
            schema.matches(/^[^<>[\]{}$%^=*|\\~`]+$/, i18n.global.t('rsvp.noCodeChars')),
        }),
    };

  // Include plus-one field if allowed
  if (plusOneAllowed) {
    shape.plus_one_name = yup
      .string()
      .nullable()
      .notRequired()
      .transform(value => (value === '' ? null : value))
      .test(
        'plus-one-name-safe',
        i18n.global.t('rsvp.noCodeChars'),
        value => value == null || /^[^<>[\]{}$%^=*|\\~`]+$/.test(value)
      );

    shape.plus_one_dietary = yup
      .string()
      .nullable()
      .notRequired()
      .transform(value => (value === '' ? null : value))
      .test(
        'plus-one-dietary-safe',
        i18n.global.t('rsvp.noCodeChars'),
        value => value == null || /^[^<>[\]{}$%^=*|\\~`]+$/.test(value)
      );
  }

  return yup.object().shape(shape);
}