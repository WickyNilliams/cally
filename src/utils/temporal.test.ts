import { PlainDate, PlainYearMonth } from "./temporal.js";
import { expect } from "@open-wc/testing";

describe("PlainDate", () => {
  describe("PlainDate.from", () => {
    it("can parse strings", () => {
      const date = PlainDate.from("2020-01-01");
      expect(date.year).to.eq(2020);
      expect(date.month).to.eq(1);
      expect(date.day).to.eq(1);
    });

    it("throws on invalid strings", () => {
      expect(() => PlainDate.from("invalid")).to.throw(TypeError);
    });

    it("can parse Date objects", () => {
      const date = PlainDate.from(new Date("2020-01-01"));
      expect(date.year).to.eq(2020);
      expect(date.month).to.eq(1);
      expect(date.day).to.eq(1);
    });
  });

  describe("PlainDate.toString", () => {
    it("uses ISO format", () => {
      const date = new PlainDate(2020, 1, 1);
      expect(date.toString()).to.eq("2020-01-01");
    });
  });

  describe("add()", () => {
    it("adds days", () => {
      const date = new PlainDate(2020, 1, 1);
      const newDate = date.add({ days: 1 });
      expect(newDate.toString()).to.eq("2020-01-02");
    });

    it("adds months", () => {
      const date = new PlainDate(2020, 1, 1);
      const newDate = date.add({ months: 1 });
      expect(newDate.toString()).to.eq("2020-02-01");
    });

    it("adds years", () => {
      const date = new PlainDate(2020, 1, 1);
      const newDate = date.add({ years: 1 });
      expect(newDate.toString()).to.eq("2021-01-01");
    });

    it("constrains month", () => {
      const date = new PlainDate(2020, 1, 31);
      const newDate = date.add({ months: 1 });
      expect(newDate.toString()).to.eq("2020-02-29");
    });

    it("constrains month negative", () => {
      const date = new PlainDate(2020, 3, 31);
      const newDate = date.add({ months: -1 });
      expect(newDate.toString()).to.eq("2020-02-29");
    });

    it("constrains month when adding years", () => {
      const date = new PlainDate(2020, 2, 29);
      const newDate = date.add({ years: 1 });
      expect(newDate.toString()).to.eq("2021-02-28");
    });
  });

  describe("toPlainYearMonth()", () => {
    it("returns a PlainYearMonth", () => {
      const date = new PlainDate(2020, 1, 1);
      const yearMonth = date.toPlainYearMonth();

      expect(yearMonth).to.be.instanceOf(PlainYearMonth);
      expect(yearMonth.year).to.eq(2020);
      expect(yearMonth.month).to.eq(1);
    });
  });

  describe("equals()", () => {
    it("returns true when dates are equal", () => {
      const date = new PlainDate(2020, 1, 1);
      const date2 = new PlainDate(2020, 1, 1);
      expect(date.equals(date2)).to.be.true;
    });

    it("returns false when dates are not equal", () => {
      const date = new PlainDate(2020, 1, 1);
      const date2 = new PlainDate(2020, 1, 2);
      expect(date.equals(date2)).to.be.false;
    });
  });
});

describe("PlainYearMonth", () => {
  describe("add()", () => {
    it("adds months", () => {
      const yearMonth = new PlainYearMonth(2020, 1);
      const newYearMonth = yearMonth.add({ months: 1 });
      expect(newYearMonth.year).to.eq(2020);
      expect(newYearMonth.month).to.eq(2);
    });

    it("adds years", () => {
      const yearMonth = new PlainYearMonth(2020, 1);
      const newYearMonth = yearMonth.add({ years: 1 });
      expect(newYearMonth.year).to.eq(2021);
      expect(newYearMonth.month).to.eq(1);
    });
  });

  describe("toPlainDate()", () => {
    it("returns a PlainDate", () => {
      const yearMonth = new PlainYearMonth(2020, 1);
      const date = yearMonth.toPlainDate();

      expect(date).to.be.instanceOf(PlainDate);
      expect(date.year).to.eq(2020);
      expect(date.month).to.eq(1);
      expect(date.day).to.eq(1);
    });
  });

  describe("equals()", () => {
    it("returns true when dates are equal", () => {
      const yearMonth = new PlainYearMonth(2020, 1);
      const yearMonth2 = new PlainYearMonth(2020, 1);
      expect(yearMonth.equals(yearMonth2)).to.be.true;
    });

    it("returns false when dates are not equal", () => {
      const yearMonth = new PlainYearMonth(2020, 1);
      const yearMonth2 = new PlainYearMonth(2020, 2);
      expect(yearMonth.equals(yearMonth2)).to.be.false;
    });
  });
});
