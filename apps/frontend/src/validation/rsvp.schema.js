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
        .nullable(),
        notes: yup
        .string()
        .nullable()
        .max(500, i18n.global.t('rsvp.notesMax')),
    };

  // Include plus-one field if allowed
  if (plusOneAllowed) {
    shape.add_plus_one = yup
      .boolean();
    shape.plus_one_name = yup
      .string()
      .nullable()
      .when('add_plus_one', {
        is: true,
        then: (schema) => schema.required(i18n.global.t('rsvp.plusOneNameRequired')),
      });
    shape.plus_one_dietary = yup
      .string()
      .nullable()
      .when('add_plus_one', {
        is: true,
        then: (schema) => schema.required(i18n.global.t('rsvp.plusOneDietaryRequired')),
      });
  }

  return yup.object().shape(shape);
}