from mxg_fleet_track.mxg_fleet_track.doctype.ft_breakdown_log import update_days_on_bd
from mxg_fleet_track.mxg_fleet_track.doctype.ft_defects_log import update_defect_days
from mxg_fleet_track.mxg_fleet_track.doctype.ft_machine import (
    update_days_since_last_hmr,
)
from mxg_fleet_track.mxg_fleet_track.doctype.ft_machine import (
    perform_lib_and_field_checks,
)
from mxg_fleet_track.mxg_fleet_track.doctype.ft_jrv import (
    update_days_on_current_stage_for_jrv,
)


def daily():
    update_days_on_bd()
    update_defect_days()
    update_days_since_last_hmr()
    update_days_on_current_stage_for_jrv()


def hourly():
    perform_lib_and_field_checks()
