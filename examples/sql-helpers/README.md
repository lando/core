# SQL Import/Export Example

This example exists primarily to test the `sql-import.sh` and `sql-export.sh` helper scripts.

## Start up tests

```bash
# Should init and start a lando app
rm -rf sqlhelpers && mkdir -p sqlhelpers
cp -rf .lando.sqlhelpers.yml sqlhelpers/.lando.yml
cp -rf testdata1.sql sqlhelpers/testdata1.sql
cp -rf testdata2.sql sqlhelpers/testdata2.sql
cd sqlhelpers && lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should import test data into mariadb
cd sqlhelpers
lando ssh -s mariadb -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s mariadb -c "mysql -utest -ptest lando_test -e 'select * from lando_test'" | grep "lando_original"

# Should import test data into mariadb-default
cd sqlhelpers
lando ssh -s mariadb-default -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s mariadb-default -c "mysql -utest -ptest database -e 'select * from lando_test'" | grep "lando_original"

# Should import test data into mysql57
cd sqlhelpers
lando ssh -s mysql57 -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s mysql57 -c "mysql -utest -ptest lando_test -e 'select * from lando_test'" | grep "lando_original"

# Should import test data into mysql57-default
cd sqlhelpers
lando ssh -s mysql57-default -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s mysql57-default -c "mysql -utest -ptest database -e 'select * from lando_test'" | grep "lando_original"

# Should import test data into mysql80
cd sqlhelpers
lando ssh -s mysql80 -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s mysql80 -c "mysql -utest -ptest lando_test -e 'select * from lando_test'" | grep "lando_original"

# Should import test data into mysql80-default
cd sqlhelpers
lando ssh -s mysql80-default -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s mysql80-default -c "mysql -utest -ptest database -e 'select * from lando_test'" | grep "lando_original"

# Should import test data into postgres16
cd sqlhelpers
lando ssh -s postgres16 -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s postgres16 -c "psql -U postgres -d lando_test -c 'select * from lando_test'" | grep "lando_original"

# Should import test data into postgres16-default
cd sqlhelpers
lando ssh -s postgres16-default -c "/helpers/sql-import.sh testdata1.sql"
lando ssh -s postgres16-default -c "psql -U postgres -d database -c 'select * from lando_test'" | grep "lando_original"

# Should export gzipped files from mariadb
cd sqlhelpers
lando ssh -s mariadb -c "/helpers/sql-export.sh mariadb_dump.sql" -u root
gzip -d mariadb_dump.sql.gz

# Should export gzipped files from mysql57
cd sqlhelpers
lando ssh -s mysql57 -c "/helpers/sql-export.sh mysql57_dump.sql" -u root
gzip -d mysql57_dump.sql.gz

# Should export gzipped files from mysql80
cd sqlhelpers
lando ssh -s mysql80 -c "/helpers/sql-export.sh mysql80_dump.sql" -u root
gzip -d mysql80_dump.sql.gz

# Should export gzipped files from postgres16
cd sqlhelpers
lando ssh -s postgres16 -c "/helpers/sql-export.sh postgres16_dump.sql" -u root
gzip -d postgres16_dump.sql.gz

# Should have the correct data in all exported files
cd sqlhelpers
grep "lando_original" mariadb_dump.sql
grep "lando_original" mysql57_dump.sql
grep "lando_original" mysql80_dump.sql
grep "lando_original" postgres16_dump.sql

# Should be able to replace data with testdata2 in mariadb
cd sqlhelpers
lando ssh -s mariadb -c "/helpers/sql-import.sh testdata2.sql"
lando ssh -s mariadb -c "mysql -utest -ptest lando_test -e 'select * from lando_test'" | grep -v "lando_original" | grep "lando_updated"

# Should be able to replace data with testdata2 in mysql57
cd sqlhelpers
lando ssh -s mysql57 -c "/helpers/sql-import.sh testdata2.sql"
lando ssh -s mysql57 -c "mysql -utest -ptest lando_test -e 'select * from lando_test'" | grep -v "lando_original" | grep "lando_updated"

# Should be able to replace data with testdata2 in mysql80
cd sqlhelpers
lando ssh -s mysql80 -c "/helpers/sql-import.sh testdata2.sql"
lando ssh -s mysql80 -c "mysql -utest -ptest lando_test -e 'select * from lando_test'" | grep -v "lando_original" | grep "lando_updated"

# Should be able to replace data with testdata2 in postgres16
cd sqlhelpers
lando ssh -s postgres16 -c "/helpers/sql-import.sh testdata2.sql"
lando ssh -s postgres16 -c "psql -U postgres -d lando_test -c 'select * from lando_test'" | grep -v "lando_original" | grep "lando_updated"
```

## Destroy tests

```bash
# Should destroy sqlhelpers successfully
cd sqlhelpers && lando destroy -y

# Should poweroff
lando poweroff
```
