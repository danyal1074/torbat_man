import { describe, expect, it } from 'vitest';
import { availability, interval, overlap, type BusinessConfig, type Allocation } from '../src/nobatino/engine';
const config: BusinessConfig = { address: 'test', category: 'ورزش', open: 540, close: 600, weekdays: [0, 1, 2, 3, 4, 5, 6], closedDates: [], cancelHours: 0,
    services: [{ id: 'main', title: 'test', minutes: 30, price: 100, capacity: 1, buffer: 0, resource: 'chair', active: true }],
    employees: [{ id: 'one', name: 'one', services: ['main'], active: true }, { id: 'two', name: 'two', services: ['main'], active: true }] };
describe('Nobatino capacity', () => {
    it('uses half-open intervals and Tehran UTC conversion', () => {
        expect(overlap(0, 30, 30, 60)).toBe(false);
        expect(interval('2026-12-01', 540).toISOString()).toBe('2026-12-01T05:30:00.000Z');
    });
    it('shares resources across specialists, frees cancelled bookings and applies buffers', () => {
        const booking: Allocation = { id: 'x', serviceId: 'main', employeeId: 'one', resource: 'chair', startAt: interval('2026-12-01', 540), endAt: interval('2026-12-01', 570), buffer: 15, capacity: 1, status: 'confirmed' };
        const now = new Date('2026-11-01');
        expect(availability(config, 'main', '2026-12-01', [booking], now)).toHaveLength(0);
        expect(availability(config, 'main', '2026-12-01', [{ ...booking, status: 'cancelled' }], now).length).toBeGreaterThan(0);
    });
    it('respects holidays, inactive workers and larger capacity', () => {
        const now = new Date('2026-11-01');
        expect(availability({ ...config, closedDates: ['2026-12-01'] }, 'main', '2026-12-01', [], now)).toEqual([]);
        expect(availability({ ...config, employees: [] }, 'main', '2026-12-01', [], now)).toEqual([]);
        expect(availability({ ...config, services: [{ ...config.services[0]!, capacity: 2 }] }, 'main', '2026-12-01', [], now)[0]?.remaining).toBe(2);
    });
});
