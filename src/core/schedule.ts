import { PetSettings } from '../shared/types';

/**
 * Checks if the current time falls within a given start/end window, 
 * correctly handling windows that wrap around midnight (e.g. 10 PM to 6 AM).
 */
export function isTimeInWindow(hour: number, start: number, end: number): boolean {
  if (start < end) {
    return hour >= start && hour < end;
  } else {
    // Midnight wrap (e.g. start=22, end=6)
    return hour >= start || hour < end;
  }
}

/**
 * Checks if the pet should be sleeping based on user settings or defaults.
 */
export function isSleeping(settings: PetSettings, hour?: number): boolean {
  if (hour === undefined) hour = new Date().getHours();
  
  const start = settings.sleepStartHour ?? 22;
  const end = settings.sleepEndHour ?? 6;
  
  return isTimeInWindow(hour, start, end);
}

/**
 * Checks if the pet is in its active work hours.
 */
export function isWorking(settings: PetSettings, hour?: number): boolean {
  if (hour === undefined) hour = new Date().getHours();
  
  const start = settings.workStartHour ?? 9;
  const end = settings.workEndHour ?? 17;
  
  return isTimeInWindow(hour, start, end);
}

/**
 * Checks if Focus Mode is currently active (either toggled on or scheduled).
 */
export function isFocusActive(settings: PetSettings, hour?: number): boolean {
  if (settings.focusActive) return true;
  
  const start = settings.focusStartHour;
  const end = settings.focusEndHour;
  
  if (start === undefined || end === undefined) return false;
  
  if (hour === undefined) hour = new Date().getHours();
  return isTimeInWindow(hour, start, end);
}

/**
 * Returns true if it is the "Yoga" hour immediately following waking up.
 */
export function isYogaTime(settings: PetSettings, hour?: number): boolean {
  if (hour === undefined) hour = new Date().getHours();
  const wakeHour = settings.sleepEndHour ?? 6;
  return hour === wakeHour;
}
