import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/id";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("id");
dayjs.tz.setDefault("Asia/Jakarta");

export const formatDate = (date: string | Date) => {
  return dayjs(date).tz("Asia/Jakarta").format("DD MMM YYYY");
};

export const formatDateTime = (date: string | Date) => {
  return dayjs(date).tz("Asia/Jakarta").format("DD MMM YYYY HH:mm");
};

export const formatRelativeTime = (date: string | Date) => {
  return dayjs(date).tz("Asia/Jakarta").fromNow();
};

export const isToday = (date: string | Date) => {
  return dayjs(date)
    .tz("Asia/Jakarta")
    .isSame(dayjs().tz("Asia/Jakarta"), "day");
};

export const getCurrentDateJakarta = () => {
  return dayjs().tz("Asia/Jakarta");
};

export const toJakartaTime = (date: string | Date) => {
  return dayjs(date).tz("Asia/Jakarta");
};

export const getStartOfDayJakarta = (date?: string | Date) => {
  const targetDate = date
    ? dayjs(date).tz("Asia/Jakarta")
    : dayjs().tz("Asia/Jakarta");
  return targetDate.startOf("day");
};

export const getEndOfDayJakarta = (date?: string | Date) => {
  const targetDate = date
    ? dayjs(date).tz("Asia/Jakarta")
    : dayjs().tz("Asia/Jakarta");
  return targetDate.endOf("day");
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat("id-ID").format(num);
};
