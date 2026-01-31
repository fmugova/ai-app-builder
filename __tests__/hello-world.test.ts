export function sum(a: number, b: number) {
  return a + b;
}

test('hello world!', () => {
	expect(sum(1, 1)).toBe(2);
});
