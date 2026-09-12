.PHONY: serve

PORT ?= 4300

# Le lab est la page d'accueil tant que le jeu n'existe pas : http://localhost:4300/lab
serve: ## Sert l'application en développement (http://localhost:4300)
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run start -w @hexrace/web -- --port $(PORT)"

serve-lan: ## La même, exposée sur le réseau local pour un téléphone
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run start -w @hexrace/web -- --port $(PORT) --host 0.0.0.0"
