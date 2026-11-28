<svelte:options runes={false} />

<script lang="ts">
  import "cally";

  let value = "";

  // a function prop, which must be set as a property rather than an attribute
  const isThirteenth = (date: Date) => date.getUTCDate() === 13;
</script>

<!-- the same as App.svelte, but in the syntax of svelte 4 -->
<output>{value}</output>
<button on:click={() => (value = "2024-03-20/2024-03-22")}>Select</button>

<calendar-range
  locale="en-GB"
  months={2}
  focusedDate="2024-03-01"
  {value}
  isDateDisallowed={isThirteenth}
  on:change={(event) => (value = (event.target as HTMLInputElement).value)}
>
  <calendar-month></calendar-month>
  <calendar-month offset={1}></calendar-month>
</calendar-range>
