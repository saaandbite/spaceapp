# Virtual Environment (venv) & Jupyter Notebook Execution Guide

This document provides a step-by-step tutorial to configure the Python virtual environment (`venv`), install dependencies, and execute the analysis and data pipeline notebooks for **SpaceApp 2026**.

---

## 1. Virtual Environment (`venv`) Setup

Ensure your terminal is located at the project root directory (folder hasil clone repo ini).

### Step 1: Create the Virtual Environment
Run the following command (only needs to be performed once):
```bash
python3 -m venv venv
```
> **Note:** The `venv/` directory is registered in `.gitignore` to prevent committing virtual environment binaries to the Git repository.

### Step 2: Activate the Virtual Environment
* **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```
* **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
* **Windows (Command Prompt):**
  ```cmd
  venv\Scripts\activate.bat
  ```

*(Upon successful activation, your shell prompt will show the `(venv)` prefix).*

### Step 3: Install Required Dependencies
Upgrade `pip` and install packages listed in `requirements.txt`:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Installed packages:
- `pandas` & `numpy` (Data manipulation and numerical operations).
- `jupyter`, `notebook`, & `ipykernel` (Notebook execution runtime).
- `scikit-learn` & `matplotlib` (Machine learning modelling and plotting).
- `rasterio` & `nbformat` (Reading the GPWv4 population raster and notebook execution).

### Step 4: Register Kernel to Jupyter (Recommended)
Register the virtual environment kernel so it appears in VS Code and Jupyter Notebook:
```bash
python -m ipykernel install --user --name=spaceapp-venv --display-name="Python (SpaceApp)"
```

---

## 2. Running Jupyter Notebooks

You can open and execute the notebooks using any of the following approaches:

### Option A: Via Visual Studio Code / Cursor IDE (Recommended)
1. Open the project root folder in VS Code.
2. Open any `.ipynb` file inside the `notebook/` directory (e.g., `pipeline_transformation.ipynb`).
3. In the upper-right corner of the editor, click **Select Kernel**.
4. Choose **Python Environments...** and select `./venv/bin/python` (or pick the `Python (SpaceApp)` kernel).
5. Click **Run All** or execute cells individually using `Shift + Enter`.

### Option B: Via Web Browser (Jupyter Notebook UI)
1. Ensure `venv` is active, then launch:
   ```bash
   jupyter notebook
   ```
2. Your browser will automatically open at `http://localhost:8888`.
3. Navigate into the `notebook/` folder and open the target `.ipynb` file.
4. From the top menu, click **Kernel** > **Change Kernel** > select **Python (SpaceApp)**.
5. Click **Cell** > **Run All**.

### Option C: Headless Execution via CLI (Terminal)
To run all notebook cells automatically in batch mode without a graphical interface:
```bash
jupyter nbconvert --to notebook --execute notebook/pipeline_transformation.ipynb --inplace
```

---

## 3. Project Notebooks & Workflow Sequence

The `notebook/` folder contains four dedicated notebooks (run in this order: API snapshot → population → pipeline → modeling):

| Notebook File | Primary Objective | Generated Deliverables |
| :--- | :--- | :--- |
| **`preprocessing_api_to_json.ipynb`** | Ingests live NASA APIs (NeoWs, Sentry, CAD) using the `.env` API key into static raw snapshots. | Raw JSON files in `datasets/nasa_neows/`, `datasets/cneos_sentry/`, and `datasets/sbdb_cad/`. |
| **`pipeline_transformation.ipynb`** | Cleans raw data (31,911 rows funnel), engineers 4 material classes, extracts 19 Indonesian meteorites, and standardizes CNEOS/API records. | Clean, transformed datasets in `datasets/transformed/` (hand-off for ML & Frontend). |
| **`modeling_and_export.ipynb`** | K-Means clustering, Random Forest Fell-vs-Found classifier, trend/material/cluster analysis, and physics + map-pin computation for the frontend. | 12 JSON files in `datasets/exports/` (plus 2 CSV copies of the transformed meteorite tables) ready for the frontend. |
| **`preprocessing_population.ipynb`** | Extracts NASA SEDAC GPWv4 global population raster into a 0.5° x 0.5° lookup grid. | `datasets/sedac_global_grid_lookup.json` (used for casualty estimation in simulator hazard rings). |

---

## 4. Deactivating the Virtual Environment

When finished, exit the virtual environment by running:
```bash
deactivate
```

---

## 5. Troubleshooting

1. **`ModuleNotFoundError: No module named 'pandas'` during execution:**
   - Verify that your IDE kernel is pointing to `./venv/bin/python`, not the system default Python interpreter.
2. **PowerShell script execution policy error on Windows (`execution of scripts is disabled`):**
   - Launch PowerShell as Administrator and run:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```
3. **NASA API Key not detected:**
   - Verify that `.env` is present at the project root with `API_KEY=your_key_here` or `NASA_API_KEY=your_key_here`.
4. **`FileNotFoundError: File .tif tidak ditemukan` when running `preprocessing_population.ipynb`:**
   - Run `jupyter nbconvert` from the project root, not from inside the `notebook/` folder. Since the 2026-11-14 fix the notebook also resolves the repo root by itself, but running from the project root is still the recommended way for all notebooks.
5. **`modeling_and_export.ipynb` fails on its first cell (`assert "datetime_utc" not in df.columns`):**
   - The committed `datasets/transformed/` files are stale. Run `pipeline_transformation.ipynb` first to regenerate them, then run the modeling notebook.
