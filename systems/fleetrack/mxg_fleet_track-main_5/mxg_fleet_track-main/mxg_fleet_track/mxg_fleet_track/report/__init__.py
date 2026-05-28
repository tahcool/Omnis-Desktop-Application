import frappe

import pandas as pd
import numpy as np


def get_defects_age_group(age=None):
    conf = frappe.get_doc("Fleetrack Settings")

    if age is None:
        return [
            f"0 - {conf.dasr_1st}",
            f"{conf.dasr_1st + 1} - {conf.dasr_2nd}",
            f"{conf.dasr_2nd + 1} - {conf.dasr_3rd}",
            f"{conf.dasr_3rd + 1} - {conf.dasr_4th}",
            f"{conf.dasr_4th}+"
        ]
    if 0 <= age <= conf.dasr_1st:
        return f"0 - {conf.dasr_1st}"

    if conf.dasr_1st + 1 <= age <= conf.dasr_2nd:
        return f"{conf.dasr_1st + 1} - {conf.dasr_2nd}"

    if conf.dasr_2nd + 1 <= age <= conf.dasr_3rd:
        return f"{conf.dasr_2nd + 1} - {conf.dasr_3rd}"

    if conf.dasr_3rd + 1 <= age <= conf.dasr_4th:
        return f"{conf.dasr_3rd + 1} - {conf.dasr_4th}"

    return f"{conf.dasr_4th}+"


def get_bd_age_group(age=None):
    conf = frappe.get_doc("Fleetrack Settings")

    if age is None:
        return [
            f"0 - {conf.basr_1st}",
            f"{conf.basr_1st + 1} - {conf.basr_2nd}",
            f"{conf.basr_2nd + 1} - {conf.basr_3rd}",
            f"{conf.basr_3rd + 1} - {conf.basr_4th}",
            f"{conf.basr_4th}+"
        ]

    if 0 <= age <= conf.basr_1st:
        return f"0 - {conf.basr_1st}"

    if conf.basr_1st + 1 <= age <= conf.basr_2nd:
        return f"{conf.basr_1st + 1} - {conf.basr_2nd}"

    if conf.dasr_2nd + 1 <= age <= conf.dasr_3rd:
        return f"{conf.basr_2nd + 1} - {conf.basr_3rd}"

    if conf.basr_3rd + 1 <= age <= conf.basr_4th:
        return f"{conf.basr_3rd + 1} - {conf.basr_4th}"

    return f"{conf.basr_4th}+"


def get_defects_aging_summary(data, columns, lod=False):
    if lod:
        df = pd.DataFrame.from_records(data)
    else:
        df = pd.DataFrame(data, columns=columns)

    if data:

        df["Aging Group"] = df["Defect Days"].apply(get_defects_age_group)
        df["Aging Group"] = pd.Categorical(df["Aging Group"], get_defects_age_group())
        df = df.sort_values("Aging Group")
        return dict(df['Aging Group'].value_counts(sort=False, normalize=True).mul(100).round(1).astype(str) + '%')
    else:
        return dict()


def get_bd_aging_summary(data, columns, lod=False, cc=None):
    # return df['dbted']
    if lod:
        df = pd.DataFrame.from_records(data)
    else:
        df = pd.DataFrame(data, columns=columns)
    if data:
        if not cc:
            df["Aging Group"] = df["Days on BD"].apply(get_bd_age_group)
        else:
            df["Aging Group"] = df[cc].apply(get_bd_age_group)

        df["Aging Group"] = pd.Categorical(df["Aging Group"], get_bd_age_group())
        df = df.sort_values("Aging Group")
        return dict(df['dbted'].value_counts(sort=False, normalize=True).mul(100).round(1).astype(str) + '%')
    return dict()


def get_sts_group(hrs=None, current_hmr=None):
    if any([hrs is None, current_hmr is None]):
        return [
            "Pending Initial Service",
            "Below 50 Towards Service",
            "Other"
        ]
    if current_hmr <= 250:
        return "Pending Initial Service"
    if hrs < 50:
        return "Below 50 Towards Service"

    return "Other"


def get_sts_summary(data, columns, lod=False):
    if lod:
        df = pd.DataFrame.from_records(data)
    else:
        df = pd.DataFrame(data, columns=columns)

    if data:
        # df["Group"] = np.vectorize(get_sts_group)(df["hours_remaining_to_service"], df["current_hmr"])
        df["Group"] = df.apply(lambda x: get_sts_group(x['hours_remaining_to_service'], x['current_hmr']), axis=1)
        df["Group"] = pd.Categorical(df["Group"], get_sts_group())
        df = df.sort_values("Group")
        return dict(df['Group'].value_counts(sort=False).astype(str))
    return dict()
