# 简单调用jenkins api，构建项目并触发webhook
import html
import json
import os
import time

import jenkins
import requests

# 预设默认值（可修改）
cd_env = ''  # dev或test

# dev和test环境独立配置
jenkins_server_url = 'https://ci.xnzn.net'  # jenkins地址
portainer_server_suffix = ''  # portainer服务名后缀
core_timeout = 60 * 10  # core构建超时时间
api_timeout = 60 * 5  # api构建超时时间
portainer_user_name = ''  # portainer用户名
portainer_user_pwd = ''  # portainer密码
portainer_api_url = ''
portainer_endpoints = ''
jenkins_user_id = ''
jenkins_api_token = ''
core_job = ''
api_job = ''

# 执行job方法，通过等待时间来判断是否构建成功
def do_job_by_time(server, job_name, param_branch, param_env, wait_time):
    queue_num = server.build_job(name=job_name,
                                 parameters={'BRANCH': param_branch, 'VERSION': param_env},
                                 token=jenkins_api_token)
    print('创建queue... {queue_num}')
    time.sleep(wait_time)
    queue_info = server.get_queue_item(queue_num)

    print('等待时间到，queue信息：' + str(queue_info))


# 执行job方法，通过请求判断结束，进度更准确
def do_job(server, job_name, param_branch, param_env, wait_time):

    queue_num = server.build_job(name=job_name,
                                 parameters={'BRANCH': param_branch, 'VERSION': param_env},
                                 token=jenkins_api_token)
    print(f'创建队列... {queue_num}')
    job_number = None
    # 记录开始构建时间
    start_time = time.time()

    while True:
        time.sleep(10)
        if time.time() - start_time > wait_time:
            print("构建超时，结束")
            exit(1)
        queue_info = server.get_queue_item(queue_num)
        if queue_info['why'] is not None:
            why = queue_info['why']
            print(f'队列等待执行器...{why}')
        elif 'executable' in queue_info:
            job_number = queue_info['executable']['number']
            print(f'开始执行任务...{job_number}')
            break
        else:
            print('执行结束')
            break

    # 间隔x秒查询构建结果
    while True:
        time.sleep(10)

        # 如果超过3分钟，直接结束
        if time.time() - start_time > wait_time:
            print("构建超时，结束")
            exit(1)
        headers = {
            "n": str(job_number),
        }
        # 如果job_name包含 '/'，则在把'/'替换为/job/
        if '/' in job_name:
            job_name_url = job_name.replace('/', '/job/')
            url = f'{jenkins_server_url}/job/{job_name_url}/buildHistory/ajax'
        else:
            url = f'{jenkins_server_url}/job/{job_name}/buildHistory/ajax'

        req = requests.Request(method='POST', url=url, headers=headers)
        response = server.jenkins_open(req)
        # 解析response包含的html
        html_str = html.unescape(response)
        if 'Expected build number' in html_str:  # 正在等待中
            print(f'\r等待中...', end='')
            continue
        elif ('预计剩余时间' in html_str) or ('Estimated remaining time' in html_str):  # 是否包含 预计剩余时间
            try:
                # 取出 '<td style="width:' 和 '%;" class="progress-bar-done"></td>' 之间的字符串
                progress = html_str.split('<td style="width:')[1].split('%;" class="progress-bar-done"></td>')[0]
                # 打印进度更新最后一行
                print(f'\r构建中...{progress}%', end='')
            except IndexError:
                print("无法从HTML字符串中提取进度信息")
            except Exception as e:
                print(f"发生错误: {e}")
            continue
        else:
            print(f"\r构建结束，耗时 {(time.time() - start_time):.2f} 秒", end='\n')
            # 查询构建结果
            build_info = server.get_build_info(job_name, job_number)
            if build_info['result'] == 'SUCCESS':
                print(f"构建成功 {html.unescape(build_info['url'])}")
            else:
                print(f"构建失败（{build_info['result']}） {html.unescape(build_info['url'])}")
                print(f"原始 build_info：{build_info}")
                print(f"原始 html：{html_str}")
                return False
            break
    return True


# 获取 Portainer JWT Token
def get_jwt_token():
    login_url = f"{portainer_api_url}/auth"
    login_data = {
        "Username": portainer_user_name,
        "Password": portainer_user_pwd,
    }
    response = requests.post(login_url, data=json.dumps(login_data))
    token = response.json()["jwt"]
    print('获取token成功')
    return token


# 获取 Service ID
def get_server_id(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    # Get list of services
    # services_response = requests.get(portainer_api_url + "/endpoints/1/docker/services", headers=headers) // dev改成了2
    url = portainer_api_url + f'/endpoints/{portainer_endpoints}/docker/services'
    services_response = requests.get(url, headers=headers)
    services = services_response.json()

    service_name = cd_env + portainer_server_suffix
    # Find service with matching name
    target_service_id = None
    for service in services:
        if service["Spec"]["Name"] == service_name:
            target_service_id = service["ID"]
            break

    print(f'查询{service_name}的service_id：{target_service_id}')
    return target_service_id


# 获取 Service 的 WebHook
def get_service_web_hook():
    pt_token = get_jwt_token()
    service_id = get_server_id(pt_token)

    headers = {
        "Authorization": f"Bearer {pt_token}",
        "Content-Type": "application/json"
    }

    # 查询service的webhook
    # url = portainer_api_url + f'/webhooks?filters=%7B%22ResourceID%22:%22{service_id}%22,%22EndpointID%22:1%7D' // dev改成了2
    url = portainer_api_url + f'/webhooks?filters=%7B%22ResourceID%22:%22{service_id}%22,%22EndpointID%22:{portainer_endpoints}%7D'
    services_response = requests.get(url, headers=headers)
    webhook_json = services_response.json()
    target_webhook_token = None
    # 是否存在webhook
    if len(webhook_json) > 0:
        target_webhook_token = webhook_json[0]['Token']
        print('获取webhook_token：' + target_webhook_token)

    #  尝试调用请求创建webhook
    if target_webhook_token is None:
        payload = {"ResourceID": service_id, "EndpointID": 2, "WebhookType": 1, "registryID": 0}
        services_response = requests.post(portainer_api_url + "/webhooks", headers=headers, data=json.dumps(payload))
        webhook_json = services_response.json()
        if webhook_json is not None and 'Token' in webhook_json:
            target_webhook_token = webhook_json['Token']
        print('创建webhook_token结果：' + target_webhook_token)

    return target_webhook_token


# 启动webhook（dev1-15）
def trigger_webhook():

    wh_token = get_service_web_hook()

    if wh_token is None:
        print(f"{cd_env}环境没有配置webhook，结束")
        exit(0)
    else:
        print("开始触发webhook")
        r = requests.post(portainer_api_url + '/webhooks/' + wh_token)
        print("webhook触发结果：" + str(r.status_code))

# 通过service id 更新
def update_portainer():

    pt_token = get_jwt_token()
    service_id = get_server_id(pt_token)

    headers = {
        "Authorization": f"Bearer {pt_token}",
        "Content-Type": "application/json"
    }

    # 调用更新（PUT请求）：
    url = portainer_api_url + f'/endpoints/{portainer_endpoints}/forceupdateservice'
    payload = {
        "serviceID": service_id,
        "pullImage": True,
    }
    services_response = requests.put(url, headers=headers, data=json.dumps(payload))
    update_rsp_json = services_response.json()
    print('更新结果：' + str(update_rsp_json))

# ~~~~~~~~~~~~~~~~~~ 开始输入 ~~~~~~~~~~~~~~~~~~~~~~~

# 打印欢迎信息
print('\n~~~~~~~~~~~~~~')
print('正在使用jenkins+portainer构建工具，目前支持dev和test环境的自动化构建+更新')
print('~~~~~~~~~~~~~~\n')

# 获取当前目录
current_dir = os.getcwd()
# 读取上一次构建的环境
with open(current_dir + '/last_cd_env.json', 'r', encoding='utf-8') as f:
    cd_env_json = json.load(f)

# 从终端获取用户输入模式
build_mode = input(f"请输入模式 0-只构建 1-全构建+更新 2-构建api+更新 3-只更新（预设{cd_env_json['build_mode']}）：", ) or cd_env_json['build_mode']

# 从终端获取用户输入cd_env
cd_env = input(f"请输入环境（预设：{cd_env_json['cd_env']}）:", ) or cd_env_json['cd_env']

# 从终端获取用户输入的分支
core_param_branch = input(f"请输入core分支（预设：{cd_env_json['core_param_branch']}）:") or cd_env_json['core_param_branch']

# 从终端输入api分支
api_param_branch = input(f"请输入api分支（预设：{cd_env_json['api_param_branch']}）:") or cd_env_json['api_param_branch']

# 从终端输入api文件夹名
# 读取上一次构建的分支
api_param_folder = input(f"请输入定制工程文件夹名（空格或None表示不需要，预设：{cd_env_json['api_param_folder']}）:") or cd_env_json['api_param_folder']

# 校验模式：
if build_mode is None or build_mode not in ('0', '1', '2', '3'):
    print("模式错误，结束")
    exit(1)
# 校验环境，如果不是dev或test开头的，直接退出
if cd_env is None or not cd_env.startswith('dev') and not cd_env.startswith('test'):
    print("环境错误，结束")
    exit(1)
# 校验分支
if core_param_branch is None:
    print("分支错误，结束")
    exit(1)
if api_param_branch is None:
    print("分支错误，结束")
    exit(1)
if api_param_folder is None or api_param_folder == '' or api_param_folder == ' ' or api_param_folder == 'none' or api_param_folder == 'None':
    api_param_folder = None
# 如果dev44及以上环境，只能使用模式0：
if cd_env.startswith('dev') and int(cd_env[3:]) >= 44 and build_mode != '0':
    print("dev43及以上环境只能使用模式0，结束")
    exit(1)

# 保存到本地环境
cd_env_json['cd_env'] = cd_env
cd_env_json['core_param_branch'] = core_param_branch
cd_env_json['api_param_branch'] = api_param_branch
cd_env_json['api_param_folder'] = api_param_folder
cd_env_json['build_mode'] = build_mode
json.dump(cd_env_json, open(current_dir + '/last_cd_env.json', 'w', encoding='utf-8'), ensure_ascii=False)

# exit(0)

# 根据环境输入，设置前缀
env_prefix = 'dev' if cd_env.startswith('dev') else 'test'

# 读取上一次构建的环境
with open(current_dir + '/env_param.json', 'r', encoding='utf-8') as f:
    env_param = json.load(f)

jenkins_user_id = env_param['jenkins_user_id'][env_prefix]
jenkins_api_token = env_param['jenkins_api_token'][env_prefix]
core_job = env_param['core_job'][env_prefix]
api_job = env_param['api_job'][env_prefix]
if api_param_folder is not None:
    core_job = api_param_folder + '/' + env_param['core_job_custom'][env_prefix]
    api_job = api_param_folder + '/' + env_param['api_job_custom'][env_prefix]

# portainer配置（如果cd_env > dev15，使用另一套配置）
if cd_env.startswith('dev') and int(cd_env[3:]) > 15:
    portainer_user_name = env_param['portainer_user_name']['dev16']
    portainer_user_pwd = env_param['portainer_user_pwd']['dev16']
    portainer_api_url = env_param['portainer_api_url']['dev16']
    portainer_endpoints = env_param['portainer_endpoints']['dev16']
    portainer_server_suffix = env_param['portainer_server_suffix']['dev16']
else:
    portainer_api_url = env_param['portainer_api_url'][env_prefix]
    portainer_user_name = env_param['portainer_user_name'][env_prefix]
    portainer_user_pwd = env_param['portainer_user_pwd'][env_prefix]
    portainer_endpoints = env_param['portainer_endpoints'][env_prefix]
    portainer_server_suffix = env_param['portainer_server_suffix'][env_prefix]

# ~~~~~~~~~~~~~~~~~ 开始打包 ~~~~~~~~~~~~~~~~~~~~~~~~

print('\n~~~~~~~~~~~~~~\n')
print('开始打包')
print("链接jenkins：" + jenkins_server_url)

# 实例化jenkins对象，连接远程的jenkins master server
j_server = jenkins.Jenkins(url=jenkins_server_url, username=jenkins_user_id, password=jenkins_api_token)
print("jenkins信息：" + j_server.get_whoami()['fullName'])

# 通过参数构建core
if int(build_mode) < 2:
    print('开始构建core：' + core_job + ' ' + time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    rs = do_job(j_server, core_job, core_param_branch, cd_env, core_timeout)
    if rs is False:
        print('构建core失败，结束')
        exit(1)
    time.sleep(10)

if int(build_mode) < 3:
    print('开始构建api：' + api_job + ' ' + time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    rs = do_job(j_server, api_job, api_param_branch, cd_env, api_timeout)
    # 如果构建api失败，再次构建
    # if rs is False:
    #     print('第一次构建api失败，再次构建')
    #     rs = do_job_1(j_server, api_job, api_param_branch, cd_env, api_timeout)
    if rs is False:
        print('构建api失败，结束')
        exit(1)
    time.sleep(2)

print('结束打包' + ' ' + time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))

# ~~~~~~~~~~~~~~~~~ 开始更新 ~~~~~~~~~~~~~~~~~~~~~~~~

# 开始更新portainer
if int(build_mode) == 0:
    print('\n~~~~~~~ 请自行更新portainer ~~~~~~~\n')
else:
    print('\n~~~~~~~~~~~~~~\n')
    print('开始更新portainer：' + portainer_api_url + ' ' + time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    # portainer配置（如果cd_env > dev15，使用update）
    if cd_env.startswith('dev') and int(cd_env[3:]) > 15:
        # 通过update更新
        update_portainer()
    else:
        # 触发webhook
        trigger_webhook()


exit(0)
