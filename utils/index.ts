// function to format milliseconds to mm:ss
export function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}
