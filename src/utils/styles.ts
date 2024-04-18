import { css } from "atomico";

export const reset = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button {
    padding: 0;
    touch-action: manipulation;
    cursor: pointer;
    user-select: none;
  }
`;

export const vh = css`
  .vh {
    position: absolute;
    transform: scale(0);
  }
`;
