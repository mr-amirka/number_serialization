// Compact serialization/deserialization for integer arrays with values in [1, 300].
// The encoding is ASCII-only and reversible.

const ASCII_ALPHABET = `123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!"#$%&'*+,-./:;<=>?@[\\]^_\`|~`;
const ASCII_ALPHABET_LENGTH = ASCII_ALPHABET.length;

// Symbols that multiply the value of the one following them:
// "" - +0,
// "0" - +89,
// "{" - +178,
// "}" - +267,
const SECOND_RANK_ALPHABET = "0{}";

const REPEAT_CHARACTER_START = "(";
const REPEAT_CHARACTER_END = ")";

const MIN_VALUE = 1;
const MAX_VALUE = 300;
const VALUE_COUNT = MAX_VALUE - MIN_VALUE + 1;
const MIN_REPETITIONS = 5;
const MIN_DOUBLE_DIGIT_REPETITIONS = 3;


const NUMERICAL_ALPHABET = (new Array(VALUE_COUNT))
  .fill("")
  .map((_, valueIndex) => {
    const secondRankCharacterIndex = Math.floor(valueIndex / ASCII_ALPHABET_LENGTH);
    const firstRankCharacter = ASCII_ALPHABET[valueIndex % ASCII_ALPHABET_LENGTH];

    return secondRankCharacterIndex
      ? `${SECOND_RANK_ALPHABET[secondRankCharacterIndex - 1]}${firstRankCharacter}`
      : firstRankCharacter;
  });

export function serializeCount(value: number): string {
  let serializedValue = '';

  while (value) {
    serializedValue = ASCII_ALPHABET[value % ASCII_ALPHABET_LENGTH] + serializedValue;
    value = Math.floor(value / ASCII_ALPHABET_LENGTH);
  }

  return serializedValue;
}

export function deserializeCount(value: string): number {
  const valueLength = value.length;
  let deserializedValue = 0;
  let offset = 0;
  let character: string;
  let characterIndex: number;

  for (; offset < valueLength; offset++) {
    character = value[offset];
    characterIndex = ASCII_ALPHABET.indexOf(character);

    if (characterIndex < 0) {
      throw new Error(`The character "${character}" in the serialized string at position ${offset} is not in the decoding alphabet.`);
    }

    deserializedValue = deserializedValue * ASCII_ALPHABET_LENGTH + characterIndex;
  }

  return deserializedValue;
}

export function serialize(numbers: number[]): string {
  if (!Array.isArray(numbers)) {
    throw new Error("Input must be an array of numbers.");
  }

  const countedNummbers: number[] = (new Array(VALUE_COUNT)).fill(0);

  for (const n of numbers) {
    if (!Number.isInteger(n) || n < MIN_VALUE || n > MAX_VALUE) {
      throw new Error("All numbers must be integers between 1 and 300.");
    }

    countedNummbers[n - MIN_VALUE]++;
  }

  let serializedNumbers = '';
  let valueIndex = 0;
  let count: number;
  let i: number;
  let character: string;

  for (; valueIndex < VALUE_COUNT; valueIndex++) {
    count = countedNummbers[valueIndex];
    character = NUMERICAL_ALPHABET[valueIndex];

    if (count >= (character.length > 1 ? MIN_DOUBLE_DIGIT_REPETITIONS : MIN_REPETITIONS)) {
      serializedNumbers += `${REPEAT_CHARACTER_START}${serializeCount(count)}${REPEAT_CHARACTER_END}`;
      count = 1;
    }

    for (i = 0; i < count; i++) {
      serializedNumbers += character;
    }
  }

  return serializedNumbers;
}

export function deserialize(serialized: string): number[] {
  const serializedLength = serialized.length;

  if (typeof serialized !== "string") {
    throw new Error("Serialized value must be a non-empty string.");
  }

  const deserializedNumbers: number[] = [];
  let character: string;
  let deserializedValue: number;
  let secondRankSymbolIndex: number;
  let base60Index: number;
  let secondRank = 0;
  let count = 1;
  let end = 0;
  let offset = 0;
  let countIndex = 0;
  let hasRepeat = false;

  for (; offset < serializedLength; offset++) {
    character = serialized[offset];

    if (character === REPEAT_CHARACTER_START) {
      if (hasRepeat) {
        throw new Error(`Unexpected character "${REPEAT_CHARACTER_START}" found at position ${offset}`);
      }

      offset++;
      end = serialized.indexOf(REPEAT_CHARACTER_END, offset);

      if (end < 0) {
        throw new Error(`Expected character "${REPEAT_CHARACTER_END}" not found`);
      }

      if (end - offset < 1) {
        throw new Error(`Deserialized count value must be a non-empty. Position: ${offset}`);
      }

      count = deserializeCount(serialized.substring(offset, end));
      hasRepeat = true;
      
      offset = end;
      continue;
    }

    secondRankSymbolIndex = SECOND_RANK_ALPHABET.indexOf(character);

    if (secondRankSymbolIndex > -1) {
      secondRank = 1 + secondRankSymbolIndex;
      continue;
    }

    base60Index = ASCII_ALPHABET.indexOf(character);
    if (base60Index < 0) {
      throw new Error(`The character "${character}" in the serialized string at position ${offset} is not in the decoding alphabet.`);
    }

    deserializedValue = secondRank * ASCII_ALPHABET_LENGTH + MIN_VALUE + base60Index;

    for (countIndex = 0; countIndex < count; countIndex++) {
      deserializedNumbers.push(deserializedValue);
    }

    secondRank = 0;
    hasRepeat = false;
    count = 1;
  }

  return deserializedNumbers;
}
