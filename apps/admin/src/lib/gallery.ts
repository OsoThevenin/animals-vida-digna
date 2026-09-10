export function moveImage<T>(list: T[], from: number, to: number): T[] {
  const isValidIndex = (index: number) => index >= 0 && index < list.length;
  if (!isValidIndex(from) || !isValidIndex(to)) {
    return list.slice();
  }
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function withPositions<T>(list: T[]): (T & { position: number })[] {
  return list.map((item, index) => ({ ...item, position: index }));
}
