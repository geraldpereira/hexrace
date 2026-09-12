.PHONY: build

build: ## Build de production de l'application
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run build"
