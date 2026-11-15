$ErrorActionPreference = 'Stop'
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install "soup-cli[train]"
soup --version
soup doctor
