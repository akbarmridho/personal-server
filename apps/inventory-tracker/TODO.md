# TODO

light mode dark mode consistencies
full mobile experiences

backdate input

date filter aktivitas

stok awal gak ada item -> harusnya bukan transaksi/gak bikin transaksi

refund bind ke parent tx id gimana

deletion varian yang masih ada stok gimana behaviornya

---

tampilan aktivitas

Terdapat 3 harga:

- Modal
- Penjualan
- Keuntungan

Daftar kolom: tanggal, tipe, keterangan, modal, penjualan, keuntungan, aksi (delete/refund)

Untuk tipe penjualan:

keterangan:

transaksi #tx
nama produk - varian - qty
penanda sudah direfund (apabila ada)

ketika dibuka detail meliputi

keterangan transaksi

lalu tabel yang meliputi

produk - varian - qty - harga modal harga jual dengan penyesuaian dengan totalnya

untuk tipe restock

keterangan:
nama produk - varian - qty
modal total.
penjualan keuntungan harus strip.

ketika dibuka detail meliputi

produk - varian - qty - harga modal dengan penyesuaian totalnya

untuk tipe refund

keterangan:
transaksi #tx
nomor transaksi yg direfund
