import { buildRamadanCalendar, WorkingCalendar } from '../src/modules/calendar';

describe('calendar', () => {
  it('treats every day as a working day by default except Friday, which gets shorter hours', () => {
    const calendar = new WorkingCalendar();
    expect(calendar.isWorkingDay('2024-06-10', 1)).toBe(true); // Monday
    expect(calendar.isWorkingDay('2024-06-14', 5)).toBe(true); // Friday: still open, just shorter

    const fridayHours = calendar.getWorkingHours('salon-women', '2024-06-14', 5);
    expect(fridayHours).toEqual({ startHour: 14, endHour: 20 });

    const mondayHours = calendar.getWorkingHours('salon-women', '2024-06-10', 1);
    expect(mondayHours).toEqual({ startHour: 10, endHour: 22 });
  });

  it('marks a fully-closed holiday as a non-working day', () => {
    const calendar = new WorkingCalendar({ holidays: [{ date: '2024-12-02', label: 'National Day', closed: true }] });
    expect(calendar.isWorkingDay('2024-12-02', 1)).toBe(false);
  });

  it('applies adjusted hours for a holiday without closing it', () => {
    const calendar = new WorkingCalendar();
    calendar.addHoliday({ date: '2024-03-15', label: 'Ramadan', adjustedHours: { startHour: 10, endHour: 16 } });
    expect(calendar.isWorkingDay('2024-03-15', 5)).toBe(true);
    expect(calendar.getWorkingHours('salon-women', '2024-03-15', 5)).toEqual({ startHour: 10, endHour: 16 });
  });

  it('builds a full Ramadan calendar range with adjusted hours applied to every day in range', () => {
    const calendar = buildRamadanCalendar({
      startDate: '2024-03-10',
      endDate: '2024-03-12',
      adjustedHours: { startHour: 10, endHour: 16 },
    });

    expect(calendar.getWorkingHours('investment', '2024-03-10', 0)).toEqual({ startHour: 10, endHour: 16 });
    expect(calendar.getWorkingHours('investment', '2024-03-11', 1)).toEqual({ startHour: 10, endHour: 16 });
    expect(calendar.getWorkingHours('investment', '2024-03-12', 2)).toEqual({ startHour: 10, endHour: 16 });
    // Outside the Ramadan range: falls back to defaults.
    expect(calendar.getWorkingHours('investment', '2024-03-13', 3)).toEqual({ startHour: 9, endHour: 21 });
  });
});
