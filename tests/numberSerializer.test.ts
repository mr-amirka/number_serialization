import {
  serialize,
  deserialize,
  serializeCount,
  deserializeCount,
} from '../src/numberSerializer';


function isAscii(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 0x7f) {
      return false;
    }
  }
  return true;
}

function slice(input: string, limit = 20): string {
  return input.slice(0, limit);
}

function simpleSerialize(numbers: number[]): string {
  return numbers.join(",");
}

function logCase(label: string, values: number[]): void {
  const original = simpleSerialize(values);
  const compressed = serialize(values);
  const ratio = compressed.length / original.length;

  // These logs provide the original string, compressed string and ratio,
  // as requested in the problem statement.
  // eslint-disable-next-line no-console
  console.log(
    `${label} -> original="${slice(original)}" compressed="${slice(compressed)}" ratio=${ratio.toFixed(
      3,
    )}`,
  );
}

describe('numberSerializer round-trip', () => {
  test('simple short example', () => {
    const values = [1, 300, 237, 188];
    const encoded = serialize(values);
    const decoded = deserialize(encoded);

    expect(decoded).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('simple short', values);
  });

  test('random 50 numbers', () => {
    const values: number[] = [];
    for (let i = 0; i < 50; i++) {
      values.push(1 + Math.floor(Math.random() * 300));
    }

    const encoded = serialize(values);
    const decoded = deserialize(encoded);

    expect(decoded).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('random 50', values);
  });

  test('random 100 numbers', () => {
    const values: number[] = [];
    for (let i = 0; i < 100; i++) {
      values.push(1 + Math.floor(Math.random() * 300));
    }

    const encoded = serialize(values);

    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('random 100', values);
  });

  test('random 500 numbers', () => {
    const values: number[] = [];
    for (let i = 0; i < 500; i++) {
      values.push(1 + Math.floor(Math.random() * 300));
    }

    const encoded = serialize(values);

    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('random 500', values);
  });

  test('random 1000 numbers', () => {
    const values: number[] = [];
    for (let i = 0; i < 1000; i++) {
      values.push(1 + Math.floor(Math.random() * 300));
    }

    const encoded = serialize(values);

    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('random 1000', values);
  });
});

describe('numberSerializer boundary cases', () => {
  test('all 1-digit numbers (1..9)', () => {
    const values = Array.from({ length: 9 }, (_, i) => i + 1);
    const encoded = serialize(values);

    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('all 1-digit (1..9)', values);
  });

  test('all 2-digit numbers (10..99)', () => {
    const values = Array.from({ length: 90 }, (_, i) => i + 10);
    const encoded = serialize(values);

    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('all 2-digit (10..99)', values);
  });

  test('all 3-digit numbers (100..300)', () => {
    const values = Array.from({ length: 201 }, (_, i) => i + 100);
    const encoded = serialize(values);

    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('all 3-digit (100..300)', values);
  });

  test('three of each number (1..300) -> 900 numbers total', () => {
    const base = Array.from({ length: 300 }, (_, i) => i + 1);
    const values = base.flatMap((v) => [v, v, v]);

    const encoded = serialize(values);

    expect(values.length).toBe(900);
    expect(deserialize(encoded)).toEqual([...values].sort((a, b) => a - b));
    expect(isAscii(encoded)).toBe(true);

    logCase('3 of each (900 numbers)', values);
  });
});

describe('serializeCount and deserializeCount', () => {
  test('round-trip for small counts', () => {
    for (const n of [1, 2, 3, 5, 10, 50, 89, 90, 91, 100, 500, 1000]) {
      const encoded = serializeCount(n);
      expect(deserializeCount(encoded)).toBe(n);
      expect(isAscii(encoded)).toBe(true);
    }
  });

  test('round-trip for zero', () => {
    const encoded = serializeCount(0);
    expect(encoded).toBe('');
    expect(deserializeCount('')).toBe(0);
  });

  test('multi-character base-89 encoding for large counts', () => {
    const n = 1000;
    const encoded = serializeCount(n);
    expect(encoded.length).toBeGreaterThan(1);
    expect(deserializeCount(encoded)).toBe(n);
  });

  test('deserializeCount throws on invalid character', () => {
    expect(() => deserializeCount('1)')).toThrow(/not in the decoding alphabet/);
    expect(() => deserializeCount('(')).toThrow(/not in the decoding alphabet/);
    expect(() => deserializeCount('ab)')).toThrow(/not in the decoding alphabet/);
  });
});

describe('serialize and deserialize error cases', () => {
  test('serialize throws on non-array', () => {
    expect(() => serialize(null as unknown as number[])).toThrow('Input must be an array');
    expect(() => serialize(undefined as unknown as number[])).toThrow('Input must be an array');
    expect(() => serialize('1,2,3' as unknown as number[])).toThrow('Input must be an array');
  });

  test('serialize throws on value out of range', () => {
    expect(() => serialize([0])).toThrow('between 1 and 300');
    expect(() => serialize([301])).toThrow('between 1 and 300');
    expect(() => serialize([1, 150, 300.5])).toThrow('between 1 and 300');
  });

  test('deserialize with empty string returns empty array', () => {
    // Implementation only checks typeof; empty string yields no iterations and []
    expect(deserialize('')).toEqual([]);
  });

  test('deserialize throws on invalid string', () => {
    expect(() => deserialize('é')).toThrow(/not in the decoding alphabet|not in the decoding/);
  });

  test('deserialize throws on unmatched repeat start', () => {
    expect(() => deserialize('(5')).toThrow(/Expected character|not found/);
  });

  test('deserialize throws on empty repeat count', () => {
    expect(() => deserialize('()1')).toThrow(/must be a non-empty|Deserialized count/);
  });
});

