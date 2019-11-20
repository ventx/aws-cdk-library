#!/bin/bash
npm i
rm -rf ./dist/

mv README.md README.md.backup
cp PyPi_Documentation.md README.md

npm run build
npm run package
python3.7 -m twine upload ./dist/python/*whl

rm README.md
mv README.md.backup README.md

npm run build
npm run package
npm publish --access public ./dist/js/*.jsii.tgz