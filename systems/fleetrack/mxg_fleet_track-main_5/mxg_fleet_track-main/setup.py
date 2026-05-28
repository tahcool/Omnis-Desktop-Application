from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in mxg_fleet_track/__init__.py
from mxg_fleet_track import __version__ as version

setup(
	name="mxg_fleet_track",
	version=version,
	description="STS & EPR",
	author="Percival Rapha",
	author_email="percival.rapha@gmail.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
