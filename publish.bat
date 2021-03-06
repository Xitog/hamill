if exist dist (
    rmdir dist /S /Q
)
python setup.py sdist bdist_wheel
twine upload dist/*
rmdir hamill.egg-info /S /Q
rmdir build /S /Q