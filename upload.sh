#!/bin/bash
npm i
npm run build
npm run package

python3.7 -m twine upload ./dist/python/*whl
npm publish --access public ./dist/js/*.jsii.tgz