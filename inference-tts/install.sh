# Create the virtual invironment
if [ ! -f "./venv/bin/activate" ]; then
    pyenv install -s 3.12;
    pyenv local 3.12;
    python -m venv venv;
fi

# Activate the virtual environment
. ./venv/bin/activate;

# Install dependencies
python -m pip install -r requirements.txt;
python -m pip install -e ../python-utils;

# Deactivate the virtual environment
deactivate;