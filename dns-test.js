import dns from 'dns';
dns.resolveSrv('_mongodb._tcp.cluster0.fhhk8.mongodb.net', (err, records) => {
  if (err) {
    console.error('DNS ERR', err);
    process.exit(1);
  }
  console.log('DNS OK', JSON.stringify(records, null, 2));
});
