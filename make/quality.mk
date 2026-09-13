.PHONY: check quality quality-typecheck quality-lint quality-lint-fix quality-layers quality-types \
        quality-duplication quality-unused format

DEPCRUISE := npx depcruise src --config $(CURDIR)/.dependency-cruiser.js --ts-config
TYPE_COVERAGE := npx type-coverage --at-least 100 --project

# Chaque projet qui a son tsconfig. Un package ajouté se déclare ici et dans eslint.config.js.
PROJECTS := packages/commons packages/inputs packages/engine packages/camera packages/tile packages/hud $(WEB)
ONLY ?= $(PROJECTS)
FILES ?= .

GATES := quality-typecheck quality-lint quality-layers quality-types quality-duplication quality-unused

# Le quotidien : toutes les portes puis toutes les suites. Le rétrécissement au diff, comme dans
# hexact, viendra quand la durée le justifiera.
check: quality test ## Toutes les portes puis toutes les suites

# Dans l'ordre où elles sont les moins chères, arrêt à la première rouge.
quality: $(GATES) ## Toutes les portes, sans les tests

quality-typecheck: ## Vérifie les types de chaque projet de ONLY, et des règles de lint maison
	@for project in $(ONLY); do \
		$(MAKE) _run-via-use-nvm CMD="$(NPM) run typecheck -w @hexrace/$$(basename $$project)" \
			|| exit 1; \
	done
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run typecheck:root"

quality-lint: ## ESLint typé sur FILES (tout le dépôt par défaut)
	$(MAKE) _run-via-use-nvm CMD="LINT_FILES='$(FILES)' $(NPM) run lint"

quality-lint-fix: ## La même, en corrigeant ce qui peut l'être
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run lint:fix"

# Lancé depuis chaque package : un alias `paths` est relatif au tsconfig qui le déclare.
quality-layers: ## Échoue si un module lit ce qu'il ne doit pas, ou si un cycle apparaît
	@for project in $(ONLY); do \
		echo "==> $$project"; \
		( cd $$project && $(MAKE) -C $(CURDIR) _run-via-use-nvm \
			CMD="cd $$project && $(DEPCRUISE) $$( [ -f tsconfig.app.json ] && echo tsconfig.app.json || echo tsconfig.json )" ) \
			|| exit 1; \
	done

# Un `any`, même implicite, est une porte que le compilateur ne garde plus : aucun n'est accepté.
quality-types: ## Échoue si un seul emplacement de ONLY est typé any
	@for project in $(ONLY); do \
		echo "==> $$project"; \
		$(MAKE) _run-via-use-nvm \
			CMD="$(TYPE_COVERAGE) $$project/$$( [ -f $$project/tsconfig.app.json ] && echo tsconfig.app.json || echo tsconfig.json )" \
			|| exit 1; \
	done

quality-duplication: ## Échoue au-delà du plafond de duplication (.jscpd.json)
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run duplication"

quality-unused: ## Échoue sur un export, un fichier ou une dépendance que rien ne lit
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run unused"

format: ## Prettier sur tout le code
	$(MAKE) _run-via-use-nvm CMD="$(NPM) run format"
