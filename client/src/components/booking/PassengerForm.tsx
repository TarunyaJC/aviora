import { useEffect } from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const passengerShape = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { message: 'Select a gender' }),
  nationality: z.string().trim().min(2, 'Nationality is required'),
  passportNumber: z.string().trim().max(20).optional(),
  passportExpiry: z.string().optional(),
});

export type PassengerFormValues = z.infer<typeof passengerShape>;

/** Drafts allow an empty gender before the form is filled in. */
export type PassengerFormDefaults = Omit<PassengerFormValues, 'gender'> & {
  gender: PassengerFormValues['gender'] | '';
} & { seatId: string };

interface PassengerFormProps {
  index: number;
  defaultValues: PassengerFormDefaults;
  isInternational: boolean;
  /** Fires on every change — the draft auto-saves, no submit button needed. */
  onChange: (values: PassengerFormValues) => void;
}

export function PassengerForm({ index, defaultValues, isInternational, onChange }: PassengerFormProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<PassengerFormValues>({
    resolver: zodResolver(passengerShape),
    mode: 'onTouched', // inline errors appear after the user interacts with a field
    defaultValues: {
      ...defaultValues,
      gender: defaultValues.gender === '' ? 'male' : defaultValues.gender,
    },
  });

  const values = watch();

  useEffect(() => {
    onChange({
      firstName: values.firstName ?? '',
      lastName: values.lastName ?? '',
      dateOfBirth: values.dateOfBirth ?? '',
      gender: values.gender,
      nationality: values.nationality ?? '',
      passportNumber: values.passportNumber,
      passportExpiry: values.passportExpiry,
    });
    // Only the watched fields are dependencies — onChange is stable per render.
  }, [
    values.firstName,
    values.lastName,
    values.dateOfBirth,
    values.gender,
    values.nationality,
    values.passportNumber,
    values.passportExpiry,
  ]);

  const complete =
    values.firstName?.trim().length >= 1 &&
    values.lastName?.trim().length >= 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth ?? '') &&
    values.nationality?.trim().length >= 2;

  const inputClasses =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 transition-colors focus:border-champagne/50 focus:outline-none';
  const labelClasses = 'mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver';
  const errorClasses = 'mt-1 text-[11px] text-red-300';

  return (
    <form
      noValidate
      onSubmit={(e) => e.preventDefault()}
      className="glass rounded-2xl p-5 sm:p-6"
      aria-label={`Passenger ${index + 1} details`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-frost">
          Passenger {index + 1}
          {defaultValues.seatId ? (
            <span className="ml-2 rounded-full bg-champagne/10 px-2.5 py-0.5 text-xs font-medium text-champagne">
              Seat {defaultValues.seatId}
            </span>
          ) : null}
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
            complete ? 'text-emerald-300' : 'text-silver'
          }`}
        >
          {complete ? (
            <>
              <CheckCircle2 className="size-3.5" aria-hidden /> Details saved
            </>
          ) : (
            <>
              <CircleDashed className="size-3.5" aria-hidden /> In progress — saved as you type
            </>
          )}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClasses} htmlFor={`p${index}-firstName`}>First name</label>
          <input id={`p${index}-firstName`} className={inputClasses} {...register('firstName')} placeholder="Aarav" />
          {errors.firstName ? <p className={errorClasses}>{errors.firstName.message}</p> : null}
        </div>
        <div>
          <label className={labelClasses} htmlFor={`p${index}-lastName`}>Last name</label>
          <input id={`p${index}-lastName`} className={inputClasses} {...register('lastName')} placeholder="Sharma" />
          {errors.lastName ? <p className={errorClasses}>{errors.lastName.message}</p> : null}
        </div>
        <div>
          <label className={labelClasses} htmlFor={`p${index}-dob`}>Date of birth</label>
          <input id={`p${index}-dob`} type="date" className={inputClasses} {...register('dateOfBirth')} />
          {errors.dateOfBirth ? <p className={errorClasses}>{errors.dateOfBirth.message}</p> : null}
        </div>
        <div>
          <label className={labelClasses} htmlFor={`p${index}-gender`}>Gender</label>
          <select id={`p${index}-gender`} className={inputClasses} {...register('gender')}>
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender ? <p className={errorClasses}>{errors.gender.message}</p> : null}
        </div>
        <div>
          <label className={labelClasses} htmlFor={`p${index}-nationality`}>Nationality</label>
          <input id={`p${index}-nationality`} className={inputClasses} {...register('nationality')} placeholder="Indian" />
          {errors.nationality ? <p className={errorClasses}>{errors.nationality.message}</p> : null}
        </div>
        {isInternational ? (
          <>
            <div>
              <label className={labelClasses} htmlFor={`p${index}-passport`}>Passport number</label>
              <input id={`p${index}-passport`} className={inputClasses} {...register('passportNumber')} placeholder="Z1234567" />
              {errors.passportNumber ? <p className={errorClasses}>{errors.passportNumber.message}</p> : null}
            </div>
            <div>
              <label className={labelClasses} htmlFor={`p${index}-passportExpiry`}>Passport expiry</label>
              <input id={`p${index}-passportExpiry`} type="date" className={inputClasses} {...register('passportExpiry')} />
            </div>
          </>
        ) : null}
      </div>
    </form>
  );
}
