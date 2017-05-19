---
layout: post
title: Integrating Nuage VSP with Ironic for multi-tenant management of bare-metals 
author: Dieter De Moitie
callout_image: nuage-community-header.jpg
tags: Openstack Ironic Liberty 
excerpt: OpenStack bare metal provisioning a.k.a Ironic is an integrated OpenStack program which allows for flexible provisioning and allocation of bare metals to tenants. This post how Nuage Networks VSP extends these capabilities for flexible allocation to individual tenant subnets using the NuageNetworks 7850 VSG.
---

# Introduction
NuageNetworks allows for the flexible mapping of virtual machines and bare metal servers to tenant networks. Within an Openstack environment, the Ironic project handles the management of bare metals. In this application note, the high level architecture and worfklow will be described, followed by how you can setup the integration yourself and attach your own bare metal to an Openstack Tenant subnet. 
 
# Architecture 
## Ironic Python Agent 
https://docs.openstack.org/developer/ironic/drivers/ipa.html 
A driver defines 3 things: Power/Boot/Deploy. Naming of the drivers is somewhat inconsistent. 
 
Ironic Python Agent is an agent for controlling and deploying Ironic controlled baremetal nodes.  
* For drivers with `pxe_` or `iscsi_` prefix IPA exposes the root hard drive as an iSCSI share and calls back to the ironic conductor. The conductor mounts the share and copies an image there. It then signals back to IPA for post-installation actions like setting up a bootloader for local boot support. 
* For drivers with `agent_` prefix the conductor prepares a swift temporary URL for an image. IPA then handles the whole deployment process: downloading an image from swift, putting it on the machine and doing any post-deploy actions. 
 
Within this application note, we will use `pxe_ipmi`, so there is no need to install Swift on the controller, and no proprietary bootup method is used. 
# Ironic Worfklow 
# Setup 
  
[Text Wrapping Break] 
# Integration Instructions 
 
 
## Create deployment network – OpenStack Controller 
``` 
neutron net-create provisioning_net 
neutron subnet-create provisioning_net 10.0.0.0/24 --disable-dhcp 
 
[root@osctrl-36101 deployimage(keystone_)]$ neutron net-list -F id -F name 
+--------------------------------------+------------------+ 
| id                                   | name             | 
+--------------------------------------+------------------+ 
| 4f85e24e-06fc-4bd9-858c-8c0abcd1f1c8 | provisioning_net | 
+--------------------------------------+------------------+ 
 
# Add conductor VM to VSG 
neutron nuage-gateway-list 
neutron nuage-gateway-port-list --gateway 17.100.36.110 
neutron nuage-gateway-vlan-list  --gateway 17.100.36.110 --gatewayport 1/1/2 
 
nuage-gateway-vlan-assign fa14d02a-59a1-4eaa-bbe5-b2dc0cb34877 ironic-test 
neutron nuage-gateway-vport-create --tenant-id ironic-test --subnet 6d473fa0-53f9-4d4d-aa9c-dd67249ac20c fa14d02a-59a1-4eaa-bbe5-b2dc0cb34877 
``` 
 
## Create Ironic Controller: 
Centos 7.3 VM 
One interface to management network 
One interface via Linux bridge to VSG 
Copy over keystonerc_admin 
yum install centos-release-openstack-liberty 
yum install net-tools vim bridge-utils tcpdump 
 
## Configure the Identity Service 
https://docs.openstack.org/developer/ironic/liberty/deploy/install-guide.html#configure-the-identity-service-for-the-bare-metal-service 
keystone user-create --name=ironic --pass=Alcateldc --email=ironic@example.com 
keystone user-role-add --user=ironic --tenant=services --role=admin 
keystone service-create --name=ironic --type=baremetal --description="Ironic bare metal provisioning service" 
keystone endpoint-create \ 
--service-id=the_service_id_above \ 
--publicurl=http://IRONIC_NODE:6385 \ 
--internalurl=http://IRONIC_NODE:6385 \ 
--adminurl=http://IRONIC_NODE:6385 \ 
--region=RegionOne 
 
## Install OpenStack ironic packages 
``` 
yum localinstall openstack-ironic-common-4.2.4-4.0.7_119_nuage.noarch.rpm 
yum localinstall openstack-ironic-api-4.2.4-4.0.7_119_nuage.noarch.rpm 
yum localinstall openstack-ironic-conductor-4.2.4-4.0.7_119_nuage.noarch.rpm 
 
yum -y install nuage-ironic-nova-4.2.4-4.0.7_119.noarch.rpm 
yum install python-ironicclient 
 
cat << EOF > /etc/ironic/ironic.conf 
[DEFAULT] 
provisioning_network = 4f85e24e-06fc-4bd9-858c-8c0abcd1f1c8 
network_provider = nuage 
auth_strategy=keystone 
 
[database] 
connection=mysql+pymysql://ironic:Alcateldc@127.0.0.1/ironic?charset=utf8 
 
[dhcp] 
dhcp_provider=none 
 
[keystone_authtoken] 
auth_uri = http://10.167.36.62:5000/v2.0 
identity_uri = http://10.167.36.62:35357 
admin_tenant_name = services 
admin_user = ironic 
admin_password = Alcateldc 
 
[neutron] 
url=http://10.167.36.62:9696 
 
auth_strategy=keystone 
 
cleaning_network_uuid=4f85e24e-06fc-4bd9-858c-8c0abcd1f1c8 
 
[glance] 
glance_host=10.167.36.62 
 
[oslo_messaging_rabbit] 
rabbit_host = controller 
rabbit_port = 5672 
rabbit_hosts = controller:5672 
rabbit_use_ssl = False 
rabbit_userid = guest 
rabbit_password = guest 
rabbit_virtual_host = / 
rabbit_ha_queues = False 
heartbeat_rate=2 
heartbeat_timeout_threshold=0 
EOF 
``` 
Cleaning is a configurable set of steps, such as erasing disk drives, that are performed on the node to ensure it is in a baseline state and ready to be deployed to. This is done after instance deletion, and during the transition from a "managed" to "available" state. Cleaning is enabled by default: 
``` 
[conductor] 
clean_nodes=true 
``` 
## Create SQL database 
``` 
yum -y install mariadb-server mariadb 
 
systemctl start mariadb 
systemctl enable mariadb 
 
mysql 
CREATE DATABASE ironic CHARACTER SET utf8; 
GRANT ALL PRIVILEGES ON ironic.* TO 'ironic'@'localhost' IDENTIFIED BY ‘Alcateldc’ 
GRANT ALL PRIVILEGES ON ironic.* TO 'ironic'@'%' IDENTIFIED BY  'Alcateldc'; 
 
# Create the database schema 
ironic-dbsync --config-file /etc/ironic/ironic.conf create_schema 
``` 
 
## Install OpenStack Nova Compute 
```  
yum install openstack-nova-compute 
/etc/nova/nova.conf – Must be on both controller and compute node 
[DEFAULT] 
compute_driver=nova.virt.ironic.IronicDriver 
scheduler_host_manager=nova.scheduler.ironic_host_manager.IronicHostManager 
compute_manager=ironic.nova.compute.manager.ClusteredComputeManager 
 
[ironic] 
# Ironic keystone admin name 
admin_username=ironic 
admin_password=Alcateldc 
admin_url=http://10.167.36.62:35357/v2.0 
admin_tenant_name=services 
api_endpoint=http://10.167.36.63:6385/v1 
```  
Note: After restarting the compute service, the nova logs show following error: `No compute node record for host osc-36102.pod36.eu.nuagedemo.net` 
 
This was resolved after the enrollment process. 
 
On OpenStack controller: 
``` 
service openstack-nova-scheduler restart 
``` 
 
On Ironic compute: 
```  
service openstack-nova-compute restart 
``` 
 
## Installing DHCP server – Ironic Controller 
``` 
yum -y install dhcp 
/etc/dhcp/dhcpd.conf: 
default-lease-time 600; 
max-lease-time 7200; 
 
allow booting; 
allow bootp; 
option option-128 code 128 = string; 
option option-129 code 129 = text; 
next-server 192.168.0.1; 
filename "/pxelinux.0"; 
 
# this DHCP server to be declared valid 
authoritative; 
# specify network address and subnet mask 
subnet 192.168.0.0 netmask 255.255.255.0 { 
 # specify the range of lease IP address 
 range dynamic-bootp 192.168.0.128 192.168.0.254; 
# specify broadcast address 
 option broadcast-address 192.168.0.255; 
 # specify default gateway 
 # option routers 10.0.0.1; 
} 
 
service dhcpd restart 
```  
## Creating the disk images 
https://docs.openstack.org/developer/ironic/liberty/deploy/install-guide.html#image-requirements 
 
https://docs.openstack.org/developer/ironic/liberty/deploy/install-guide.html#building-or-downloading-a-deploy-ramdisk-image 
 
 
Create user image - Ironic controller (could be done on OSC as well) 
yum install diskimage-builder 
mkdir diskimage; cd diskimage/ 
disk-image-create centos baremetal dhcp-all-interfaces grub2 -o my-imag 
scp * root@10.167.36.62:/root/diskimage 
 
While the user manual states “--is-public True”, it should be “--visibility public”, it also requires the parameter “--container-format”: 
 
glance image-create --name my-kernel --visibility public --disk-format aki --container-format aki < my-imag.vmlinuz 
=>Kernel_id 
glance image-create --name my-image.initrd --visibility public --disk-format ari --container-format ari  < my-imag.initrd 
=>Ramdisk_id 
glance image-create --name my-image --visibility public --disk-format qcow2 --container-format bare --property \ 
kernel_id=54fffc06-822d-4ca2-9770-bf1e11a24d95 --property \ 
ramdisk_id=e205ecc3-d72f-4ca3-a621-0042ed698a35 < my-imag.qcow2 
 
 
Create deploy image from  - OpenStack controller 
mkdir deployimage; cd deployimage 
yum install git 
disk-image-create ironic-agent fedora -o ironic-deploy 
scp ironic-deploy.kernel  ironic-deploy.initramfs root@10.167.36.62:/root/deployimage 
 
glance image-create --name deploy-vmlinuz --visibility public \ 
--disk-format aki --container-format aki < ironic-deploy.kernel 
glance image-create --name deploy-initrd --visibility public \ 
--disk-format ari --container-format ari < ironic-deploy.initramfs 
 
Flavor creation – OpenStack controller 
# 1024 Mb ram, 100 Gb disk and 2 CPU 
nova flavor-create my-baremetal-flavor auto 1024 100 2 
nova flavor-key my-baremetal-flavor set cpu_arch=x86_64 
 
Associate deploy disk images to node’s driver_info – Ironic Controller 
ironic node-list 
ironic node-update 40928205-b463-4846-b68a-97099512d8df add \ 
driver_info/deploy_kernel=71272c33-8989-4600-8e43-e894e6907e19 \ 
driver_info/deploy_ramdisk=ddf9ec2c-5147-49c1-8f45-8105fb576cba 
 
[root@osc-36102 deployimage(keystone_)]$ ironic node-show 40928205-b463-4846-b68a-97099512d8df 
+------------------------+--------------------------------------------------------------+ 
| Property               | Value                                                        | 
+------------------------+--------------------------------------------------------------+ 
| target_power_state     | None                                                         | 
| extra                  | {}                                                           | 
| last_error             | None                                                         | 
| updated_at             | 2017-03-24T12:16:41+00:00                                    | 
| maintenance_reason     | None                                                         | 
| provision_state        | available                                                    | 
| clean_step             | {}                                                           | 
| uuid                   | 40928205-b463-4846-b68a-97099512d8df                         | 
| console_enabled        | False                                                        | 
| target_provision_state | None                                                         | 
| provision_updated_at   | None                                                         | 
| maintenance            | False                                                        | 
| inspection_started_at  | None                                                         | 
| inspection_finished_at | None                                                         | 
| power_state            | None                                                         | 
| driver                 | pxe_ipmitool                                                 | 
| reservation            | None                                                         | 
| properties             | {}                                                           | 
| instance_uuid          | None                                                         | 
| name                   | None                                                         | 
| driver_info            | {u'deploy_ramdisk': u'ddf9ec2c-5147-49c1-8f45-8105fb576cba', | 
|                        | u'deploy_kernel': u'71272c33-8989-4600-8e43-e894e6907e19'}   | 
| created_at             | 2017-03-23T16:28:56+00:00                                    | 
| driver_internal_info   | {}                                                           | 
| chassis_uuid           |                                                              | 
| instance_info          | {}                                                           | 
+------------------------+--------------------------------------------------------------+ 
 
## Enrollment process – Ironic Node 
 
https://docs.openstack.org/developer/ironic/liberty/deploy/install-guide.html#enrollment 
 
 
[root@osc-36102 ~(keystone_)]$ ironic node-create -d pxe_ipmitool 
+--------------+--------------------------------------+ 
| Property     | Value                                | 
+--------------+--------------------------------------+ 
| uuid         | 40928205-b463-4846-b68a-97099512d8df | 
| driver_info  | {}                                   | 
| extra        | {}                                   | 
| driver       | pxe_ipmitool                         | 
| chassis_uuid |                                      | 
| properties   | {}                                   | 
| name         | None                                 | 
+--------------+--------------------------------------+ 
 
[root@osc-36102 ~(keystone_)]$ ironic node-show 40928205-b463-4846-b68a-97099512d8df 
+------------------------+--------------------------------------+ 
| Property               | Value                                | 
+------------------------+--------------------------------------+ 
| target_power_state     | None                                 | 
| extra                  | {}                                   | 
| last_error             | None                                 | 
| updated_at             | None                                 | 
| maintenance_reason     | None                                 | 
| provision_state        | available                            | 
| clean_step             | {}                                   | 
| uuid                   | 40928205-b463-4846-b68a-97099512d8df | 
| console_enabled        | False                                | 
| target_provision_state | None                                 | 
| provision_updated_at   | None                                 | 
| maintenance            | False                                | 
| inspection_started_at  | None                                 | 
| inspection_finished_at | None                                 | 
| power_state            | None                                 | 
| driver                 | pxe_ipmitool                         | 
| reservation            | None                                 | 
| properties             | {}                                   | 
| instance_uuid          | None                                 | 
| name                   | None                                 | 
| driver_info            | {}                                   | 
| created_at             | 2017-03-23T16:28:56+00:00            | 
| driver_internal_info   | {}                                   | 
| chassis_uuid           |                                      | 
| instance_info          | {}                                   | 
+------------------------+--------------------------------------+ 
 
root@osc-36102 ~(keystone_)]$ ironic node-list 
+--------------------------------------+------+---------------+-------------+--------------------+-------------+ 
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance | 
+--------------------------------------+------+---------------+-------------+--------------------+-------------+ 
| 40928205-b463-4846-b68a-97099512d8df | None | None          | None        | available          | False       | 
+--------------------------------------+------+---------------+-------------+--------------------+-------------+ 
 
## To Check 
 
sudo yum install grub2-efi shim 
 
    sudo cp /boot/efi/EFI/centos/shim.efi /tftpboot/bootx64.efi 
    sudo cp /boot/efi/EFI/centos/grubx64.efi /tftpboot/grubx64.efi 
 
 GRUB_DIR=/tftpboot/EFI/centos 
sudo mkdir -p $GRUB_DIR 
 
cd $GRUB_DIR 
vim grub.cfg 
 
sudo chmod 644 $GRUB_DIR/grub.cfg 
 ironic node-update 40928205-b463-4846-b68a-97099512d8df add properties/capabilities='boot_mode:uefi' 
 
 
cp -v /usr/share/syslinux/pxelinux.0 /tftpboot 
cp -v /usr/share/syslinux/menu.c32 /tftpboot 
cp -v /usr/share/syslinux/memdisk /tftpboot 
cp -v /usr/share/syslinux/mboot.c32 /tftpboot 
 
https://docs.openstack.org/project-install-guide/baremetal/newton/setup-drivers.html 
 
sudo yum install tftp-server syslinux-tftpboot xinetd 
 
 
vi /etc/xinetd.d/tftp 
 
service tftp 
{ 
  protocol        = udp 
  port            = 69 
  socket_type     = dgram 
  wait            = yes 
  user            = root 
  server          = /usr/sbin/in.tftpd 
  server_args     = -v -v -v -v -v --map-file /tftpboot/map-file /tftpboot 
  disable         = no 
  # This is a workaround for Fedora, where TFTP will listen only on 
  # IPv6 endpoint, if IPv4 flag is not used. 
  flags           = IPv4 
} 
 
systemctl restart xinetd 
 
 
cp /boot/extlinux/chain.c32 /tftpboot 
 
# Create map file 
echo 're ^(/tftpboot/) /tftpboot/\2' > /tftpboot/map-file 
echo 're ^/tftpboot/ /tftpboot/' >> /tftpboot/map-file 
echo 're ^(^/) /tftpboot/\1' >> /tftpboot/map-file 
echo 're ^([^/]) /tftpboot/\1' >> /tftpboot/map-file 
 
vi /etc/xinetd.d/tftp  
 
[root@osc-36102 tftpboot(keystone_)]$ ipmitool -I lanplus -H 10.167.36.125 -U ADMIN -P ADMIN chassis power status 
Chassis Power is on 
 
 
 
 
 
 
 
 
 
ironic node-create -d pxe_ipmitool 
 
ironic node-update cbe08678-b1be-4683-b8e6-bdc8515890ad add properties/cpus=2 properties/memory_mb=1024 properties/local_gb=100 properties/cpu_arch=x86_64 properties/capabilities="boot_option:local" driver_info/ipmi_address=10.167.36.125 driver_info/ipmi_username=ADMIN driver_info/ipmi_password=ADMIN driver_info/deploy_kernel=71272c33-8989-4600-8e43-e894e6907e19 driver_info/deploy_ramdisk=ddf9ec2c-5147-49c1-8f45-8105fb576cba 
ironic port-create -n cbe08678-b1be-4683-b8e6-bdc8515890ad -a 0c:c4:7a:0e:2b:6b 
 
:68 for the first interface 
 
ironic port-update b65cff1f-0625-432f-81e1-270759ab8b67 add extra/gateway_name=17.100.36.110 extra/gateway_port=1/1/5 extra/gateway_vlan=0 
 
nova boot BM.1 --image my-image --flavor my-baremetal-flavor --nic net-id=7cdf04bc-abd0-4b9c-9a97-e53216b49796 
 
 
 
[root@osc-36102 modules(keystone_)]$  ironic node-validate 40928205-b463-4846-b68a-97099512d8df 
+------------+--------+-------------------------------------------------------------------------------------------------------------------------------------------+ 
| Interface  | Result | Reason                                                                                                                                    | 
+------------+--------+-------------------------------------------------------------------------------------------------------------------------------------------+ 
| boot       | False  | Cannot validate PXE bootloader. Some parameters were missing in node's instance_info.. Missing are: ['ramdisk', 'kernel', 'image_source'] | 
| console    | False  | Missing 'ipmi_terminal_port' parameter in node's driver_info.                                                                             | 
| deploy     | False  | Cannot validate PXE bootloader. Some parameters were missing in node's instance_info.. Missing are: ['ramdisk', 'kernel', 'image_source'] | 
| inspect    | None   | not supported                                                                                                                             | 
| management | True   |                                                                                                                                           | 
| power      | True   |                                                                                                                                           | 
| raid       | None   | not supported                                                                                                                             | 
+------------+--------+-------------------------------------------------------------------------------------------------------------------------------------------+ 
 
=========> Will work after nova boot? 
