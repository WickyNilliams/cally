// checked by `tsc`, to make sure the types from the docs are applied

// @ts-expect-error months is a number
export const wrongType = <calendar-range months="two" />;
