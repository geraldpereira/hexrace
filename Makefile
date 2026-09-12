SHELL := /bin/bash
NPM := npm
WEB := apps/web
NODE_VERSION := 24

export NG_CLI_ANALYTICS := false
MAKEFLAGS += --no-print-directory

.DEFAULT_GOAL := help
.PHONY: help _run-via-nvm _run-via-use-nvm

# La liste sort dans l'ordre des includes ci-dessous.
help: ## Liste les cibles
	@echo "HexRace - cibles disponibles :"
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

_run-via-nvm:
	. $(HOME)/.nvm/nvm.sh && $(CMD)

_run-via-use-nvm:
	. $(HOME)/.nvm/nvm.sh && nvm use $(NODE_VERSION) >/dev/null && $(CMD)

include make/install.mk
include make/serve.mk
include make/build.mk
include make/quality.mk
include make/test.mk
