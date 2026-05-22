# pipelines/__init__.py
# Makes the pipelines directory a proper Python package for clean imports.
#
# Usage:
#   from pipelines.data_prep_pipeline import run_pipeline as run_data_prep
#   from pipelines.rfm_pipeline import run_pipeline as run_rfm
#   from pipelines.recommendation_pipeline import run_pipeline as run_recommendations
#   from pipelines.full_retraining_pipeline import run_pipeline