
import { describe,it,expect } from 'vitest';
import { compare, days, emptyHome, makePlan, report } from '../src/energy/engine';
describe('Energy calculations',()=>{
 const bills=[
 {id:'a',fuel:'gas' as const,start:'2025-12-01',end:'2025-12-31',consumption:350,amount:0,sample:true},
 {id:'b',fuel:'gas' as const,start:'2025-12-31',end:'2026-01-30',consumption:287,amount:0,sample:true}];
 it('normalizes period lengths and reproduces 18 percent and 63 cubic meters',()=>{
  expect(days(bills[0]!.start,bills[0]!.end)).toBe(30);
  expect(compare(bills,'gas')?.percent).toBeCloseTo(18);
  expect(compare(bills,'gas')?.saved).toBeCloseTo(63);
 });
 it('handles zero baseline, missing data, separate fuels and increases',()=>{
  expect(compare([],'gas')).toBeNull();expect(compare(bills,'water')).toBeNull();
  expect(compare([{...bills[0]!,consumption:0},bills[1]!],'gas')).toBeNull();
  expect(compare([bills[0]!,{...bills[1]!,consumption:400}],'gas')!.percent).toBeLessThan(0);
 });
 it('does not equate activity completion to savings',()=>{
  const home=emptyHome();home.missions=makePlan(home);
  expect(home.missions).toHaveLength(30);expect(report(home).comparisons.gas).toBeNull();
  expect(report(home).activityPoints).toBe(0);
 });
});
