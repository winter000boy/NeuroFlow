export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
