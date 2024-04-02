import { css } from "atomico";

export const reset = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const vh = css`
  .vh {
    position: absolute;
    transform: scale(0);
  }
`;
