export function element<T extends Element>(
  selector: string,
  type: { new (): T },
): T {
  const result = document.querySelector(selector);
  if (!(result instanceof type))
    throw new Error(`Elemento ausente ou inválido: ${selector}`);
  return result;
}
