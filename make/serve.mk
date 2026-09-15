.PHONY: serve

PORT ?= 4300

# Le lab est la page d'accueil tant que le jeu n'existe pas : http://localhost:4300/lab
serve: ## Sert l'application en développement (http://localhost:4300)
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run start -w @hexrace/web -- --port $(PORT)"

# En https : AudioWorklet n'existe qu'en contexte sécurisé, sans quoi le son manque hors localhost.
# Le téléphone accepte le certificat auto-signé une fois.
serve-lan: ## La même, exposée en https sur le réseau local pour un téléphone
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run start -w @hexrace/web -- --port $(PORT) --host 0.0.0.0 --ssl"
