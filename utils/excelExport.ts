export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // Ambil header dari key objek pertama
  const headers = Object.keys(data[0]);
  
  // Membuat format HTML Table yang bisa dibaca oleh Excel sebagai .xls
  let excelContent = `
    <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${headers.map(h => {
                  const val = row[h];
                  // Cek apakah tipe data angka untuk menghindari format text di excel jika perlu
                  const isNumber = typeof val === 'number';
                  return `<td ${isNumber ? '' : 'style="mso-number-format:\@"'}>${val !== null && val !== undefined ? val : ''}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Buat Blob dengan tipe MIME Excel
  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  
  // Buat link download
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`); // Ekstensi .xls
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};