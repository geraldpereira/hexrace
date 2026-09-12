.PHONY: test test-watch

test: ## Toutes les suites : chaque package, puis l'application
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run test"

# make test-watch ONLY=packages/inputs
test-watch: ## Une suite en continu : make test-watch ONLY=packages/inputs
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run test:watch -w @hexrace/$$(basename $(ONLY))"
