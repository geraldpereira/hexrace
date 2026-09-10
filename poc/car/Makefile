WORKSPACE ?= $(shell bash -c 'pwd')
.PHONY: install test lint build serve clean

install:
	npm install

test:
	npm test

lint:
	npm run lint

build: clean
	npm run build

serve: build
	npm run dev

clean:
	rm -rf dist
