/** @jsxImportSource ../core/jsx-html */
import { repeat } from "../core/jsx-html/jsx-runtime.js";

const dayHeader = (
  <th part="th day" scope="col">
    <span class="vh"></span>
    <span aria-hidden="true"></span>
  </th>
);

const weekRow = (
  <tr part="tr week">
    <th class="num" part="th weeknumber" scope="row"></th>
    {repeat(7, () => (
      <td part="td">
        <button class="num"></button>
      </td>
    ))}
  </tr>
);

// all 6 possible week rows are rendered up front; rows and week number
// cells that aren't needed get detached from the DOM as the view changes
export const monthHtml: string = (
  <>
    <calendar-heading month="long" id="h" class="vh"></calendar-heading>
    <slot name="heading" part="heading">
      <calendar-heading month="long" aria-hidden="true"></calendar-heading>
    </slot>
    <table aria-labelledby="h" part="table">
      <colgroup>
        <col part="col-weeknumber" />
        {repeat(7, (i) => (
          <col part={`col-${i + 1}`} />
        ))}
      </colgroup>
      <thead>
        <tr part="tr head">
          <th part="th weeknumber">
            <slot name="weeknumber">
              <span class="vh">Week</span>
              <span aria-hidden="true">#</span>
            </slot>
          </th>
          {repeat(7, () => dayHeader)}
        </tr>
      </thead>
      <tbody>{repeat(6, () => weekRow)}</tbody>
    </table>
  </>
);
