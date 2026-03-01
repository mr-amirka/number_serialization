# number_serialization

Compact ASCII-only serialization / deserialization for arrays of integers in the range \[1, 300\], with strong compression relative to simple comma-separated strings.

The library is implemented in TypeScript and tested with Jest.

---

## Problem statement

We are given a **multiset (array) of integers**:

- Each integer is in the range **1..300** (inclusive).
- The array length is from 5 to 1000 in the problem statement; the implementation accepts any non-negative length.
- Order of elements is **not significant**: the data is treated as a **multiset**. The serialized form is a **canonical** representation; decoding always returns the same multiset in **sorted order** (ascending by value).

A naive serialization is a comma-separated list ending with a dot, for example:

- Array: `[1, 300, 237, 188]`
- Simple serialization: `"1,300,237,188."`

The goal is to provide a **much more compact**, **ASCII-only**, **reversible** serialization:

- The compressed string should typically be **less than half the length** of the naive string representation.
- Decoding recovers the same multiset (including duplicates), in **sorted order**.

---

## Approach (high level)

The input is treated as a **multiset**: only the counts of each value (1..300) matter, not their order. Serialization produces a **canonical** string; decoding always returns the multiset in **sorted order** (ascending).

### Value encoding

Each value in `1..300` is represented using a **91-character printable ASCII alphabet** (digits `1–9`, letters `A–Z`, `a–z`, and punctuation):

- Values **1..89** use **one character** from the alphabet.
- Values **90..178**, **179..267**, and **268..300** use **two characters**: an optional prefix from the *second-rank* alphabet `"0{}"` (encoding +89, +178, +267) followed by one character from the primary alphabet.

So every value uses either 1 or 2 ASCII characters.

### Run-length style compression

To improve the compression ratio when the same value appears many times, the encoder:

1. **Counts** how many times each value 1..300 appears.
2. Emits values in **ascending order** (1, 2, …, 300).
3. For each value, it may emit a **repeat block** instead of repeating the value character(s)—but only when that **saves characters**:
   - **Single-character values** (1..89): use repeat syntax only when the count is **≥ 5** (e.g. `(5)1` is shorter than `11111`; for 2–4 occurrences, the value is repeated literally).
   - **Two-character values** (90..300): use repeat syntax when the count is **≥ 3** (e.g. `(3)XY` is shorter than `XYXYXY`).
   - **Repeat syntax**: `(` + *count* + `)` where *count* is encoded in base-91 using the same alphabet, then the value is emitted **once**; the decoder repeats that value *count* times.

Example: five occurrences of the value `1` are encoded as `(5)1` instead of `11111`. Fewer than 5 occurrences of `1` are written as `1`, `11`, `111`, or `1111`.

### Properties

- **ASCII-only**: all output characters are printable ASCII.
- **Reversible**: `deserialize(serialize(numbers))` returns the same multiset in sorted order.
- **Compact**: single-character values and run-length encoding for repeated values yield a better compression ratio than the previous per-value-only encoding, especially for arrays with many duplicates.

---

## Installation

From the project root:

```bash
npm install
```

Build (optional, if you want compiled JS in `build/`):

```bash
npm run build
```

Run tests:

```bash
npm test
```

The tests will also log the **original string**, **compressed string**, and **compression ratio** for several scenarios.

---

## API

### `serialize(numbers: number[]): string`

**Description**

Serializes an array of integers (treated as a **multiset**) into a compact ASCII string. The encoded form is canonical; decoding returns the same multiset in **sorted order** (ascending).

**Constraints**

- `numbers` must be an array of integers.
- Each integer must be in the range **1..300** (inclusive).
- The array may be of any length (tests cover up to 1000 elements).

**Errors**

- Throws if:
  - `numbers` is not an array.
  - Any element is not an integer in the allowed range.

**Example**

```ts
import { serialize } from './src/numberSerializer';

const values = [1, 300, 237, 188];
const encoded = serialize(values);
// encoded is a compact ASCII string; decoded array will be [1, 188, 237, 300]
```

---

### `deserialize(serialized: string): number[]`

**Description**

Deserializes a string produced by `serialize` back into the multiset of integers. The returned array is always in **sorted order** (ascending by value).

**Errors**

- Throws if:
  - The input is not a string.
  - The string contains characters that are not part of the encoding alphabets (including invalid or unmatched repeat markers `(` / `)`).
  - A decoded value falls outside the range `1..300`.

**Example**

```ts
import { serialize, deserialize } from './src/numberSerializer';

const original = [1, 300, 237, 188];
const encoded = serialize(original);
const decoded = deserialize(encoded); // [1, 188, 237, 300] — same multiset, sorted
```

---

### `serializeCount(value: number): string`

**Description**

Encodes a positive integer (e.g. a repetition count) as a string using the same 91-character alphabet in base-91. Used internally for the repeat syntax `(count)`.

**Example**

```ts
import { serializeCount } from './src/numberSerializer';

serializeCount(5);  // e.g. "5"
serializeCount(100); // multi-character base-91 encoding
```

---

### `deserializeCount(value: string): number`

**Description**

Decodes a string produced by `serializeCount` back into a non-negative integer. Throws if the string contains a character not in the alphabet.

---

## Usage from TypeScript

```ts
import { serialize, deserialize } from './src/numberSerializer';

const data: number[] = [];
for (let i = 0; i < 100; i++) {
  data.push(1 + Math.floor(Math.random() * 300));
}

// Serialize (multiset → canonical string)
const encoded = serialize(data);

// Store or transmit `encoded` (ASCII-only)

// Deserialize (canonical string → multiset in sorted order)
const decoded = deserialize(encoded);

// Same multiset: sort and compare
const sorted = [...data].sort((a, b) => a - b);
console.log(JSON.stringify(decoded) === JSON.stringify(sorted)); // true
```

---

## Tests and example scenarios

The Jest test suite exercises:

- **Simple short**:
  - `[1, 300, 237, 188]`
- **Random arrays**:
  - 50, 100, 500, 1000 numbers (values in `1..300`).
- **Boundary-like cases**:
  - All 1-digit numbers: `1..9`.
  - All 2-digit numbers: `10..99`.
  - All 3-digit numbers: `100..300`.
  - 3 copies of each number `1..300` (900 numbers).

For each case, tests:

- Assert round-trip correctness: the decoded array is the same **multiset** in **sorted order** (i.e. `[...values].sort((a,b) => a-b)` compared to `deserialize(serialize(values))`).
- Assert that the compressed string is ASCII-only.
- Log the original baseline string, compressed string, and compression ratio.

Run tests with:

```bash
npm test
```

---

## Approximate compression ratios by size

The simple (baseline) representation is comma-separated decimal numbers. For an array of length \(n\) with values in `1..300`, the expected naive length is about

\[
L_\text{simple}(n) \approx n \cdot 2.64 + (n - 1) \approx 3.64n \text{ characters}.
\]

The compact encoding uses:

- A **canonical multiset** representation (values emitted in ascending order).
- **1 or 2 characters per value** (values 1..89 → 1 char; 90..300 → 2 chars with a prefix).
- **Run-length compression**: when a value appears often enough that `(count)` plus one copy of the value is shorter than repeating the value, the encoder uses that form (single-char values: count ≥ 5; two-char values: count ≥ 3). This avoids repeat overhead when it wouldn’t save space.

For **uniformly random** data (few duplicates), expected compressed length is roughly \(1.7n\) characters, so the ratio \(L_\text{simple} / L_\text{compressed}\) is about **2.1×**. For data with **many repeated values** (e.g. “3 of each 1..300” → 900 numbers), run-length encoding significantly shortens the string, so the compression ratio can be **higher** than for random data.

| Number of values \(n\) | Approx. simple length | Approx. compressed (random) | Typical ratio (random) |
| ----------------------: | ---------------------: | ----------------------------: | ------------------------: |
| 10                      | \(\approx 36\)         | \(\approx 17\)                 | \(\approx 2.1\times\)     |
| 50                      | \(\approx 182\)        | \(\approx 85\)                 | \(\approx 2.1\times\)     |
| 100                     | \(\approx 364\)        | \(\approx 170\)                | \(\approx 2.1\times\)     |
| 500                     | \(\approx 1820\)       | \(\approx 850\)                | \(\approx 2.1\times\)     |
| 1000                    | \(\approx 3640\)       | \(\approx 1700\)               | \(\approx 2.1\times\)     |

Actual ratios depend on the distribution of values; see Jest test logs (baseline: `numbers.join(',')`).

### Minimum and maximum compression

In the test suite, the **compression ratio** is defined as `compressed.length / original.length` (baseline = comma-separated decimals). **Lower ratio means better compression.**

- **Maximum compression (best case)**  
  The best compression occurs when the multiset has **many repetitions** of the same value. Run-length encoding then replaces long runs with a short `(count)` plus one value character.

  - Example: 1000 copies of the value `1`.  
    - Simple: `1,1,1,...,1` → length 1999.  
    - Compressed: `(count)1` where `count` is 1000 in base-89 (a few characters) → length on the order of 5–6 characters.  
  - So the ratio can be as low as **~0.003** (compressed/original), i.e. the simple string can be **hundreds of times longer** than the compressed string. The more repeated values and the higher the count, the better the compression.

- **Minimum compression (worst case)**  
  The least compression (ratio closest to 1) occurs when there are **no repetitions** and values use the **most characters** in the encoding (two characters per value, i.e. 90..300), while the simple representation uses **few digits** (e.g. two-digit numbers 10..99).

  - Example: \(n\) distinct values in 90..99 (each encoded as 2 chars, simple as 2 digits + comma).  
    - Simple: \(3n - 1\).  
    - Compressed: \(2n\).  
    - Ratio: \(2n / (3n-1) \to 2/3 \approx 0.67\) as \(n\) grows.  
  - For one-digit values (1..9), compressed uses 1 char each and simple uses 1 digit + comma, so ratio \(\approx 0.5\). For three-digit values (100..300), compressed is still 2 chars per value and simple is 4n-1, so ratio \(\approx 0.5\). So in practice the **worst-case ratio is around 0.5–0.67**: the compressed string is always at least about half the length of the simple string, and can be much shorter when there are many duplicates.

---

## Notes and limitations

- The scheme is **lossless** and deterministic.
- **Order is not preserved**: the data is a multiset; decoding always returns values in **sorted order**.
- It is designed for the **fixed range 1..300**; do not use it for arbitrary integers without adapting the encoding.
- Compression is most effective when the multiset has many repeated values, thanks to the `(count)` run-length syntax.

