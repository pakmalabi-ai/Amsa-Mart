// Fix: Remove reference to vite/client type definition which is missing
interface Window {
  html2pdf: any;
}
