.PHONY: setup version install clean

setup: ## Installe nvm et la version de Node qu'Angular 22 demande
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
	$(MAKE) _run-via-nvm CMD="nvm install $(NODE_VERSION)"
	$(MAKE) _run-via-nvm CMD="nvm install-latest-npm"
	$(MAKE) version

version: ## Affiche les versions de l'outillage
	$(MAKE) _run-via-use-nvm CMD="node --version && npm --version"

install: ## Installe les dépendances de tous les workspaces
	$(MAKE) _run-via-use-nvm CMD="$(NPM) install"

clean: ## Supprime les sorties de build et les dépendances installées
	rm -rf node_modules packages/*/node_modules apps/*/node_modules
	rm -rf packages/*/dist apps/*/dist $(WEB)/.angular coverage packages/*/coverage apps/*/coverage
